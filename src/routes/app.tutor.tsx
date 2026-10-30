import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LearningEngine, type StudyRecommendation } from "@/lib/learning-engine";
import { retryDelayMs } from "@/lib/tutor-retry-policy";


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const separator = result.indexOf(",");
      resolve(separator >= 0 ? result.slice(separator + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

const MAX_TUTOR_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_TUTOR_IMAGE_BYTES = 4 * 1024 * 1024;

function audioExtensionForMime(mime: string): string {
  const normalized = mime.toLowerCase().split(";")[0].trim();
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "m4a";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("flac")) return "flac";
  return "webm";
}

function getAudioMimeType(file: File): string {
  if (file.type.startsWith("audio/") || file.type === "video/mp4") return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav",
    webm: "audio/webm", ogg: "audio/ogg", oga: "audio/oga",
    flac: "audio/flac", mp4: "video/mp4",
  };
  return (extension && byExtension[extension]) || file.type;
}

function getImageMimeType(file: File): string {
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif",
  };
  return (extension && byExtension[extension]) || file.type;
}

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });
// Tutor integrado ao percurso do aluno — próximo passo personalizado vem do backend.

type VisualAid = {
  enabled: boolean;
  type: "flow" | "concept_map" | "comparison";
  title: string;
  items: string[];
  caption: string;
  image?: {
    enabled: boolean;
    url: string;
    title: string;
    sourceUrl: string;
    license: string;
    attribution: string;
  } | null;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  shareable?: boolean;
  visualAid?: VisualAid | null;
  videoRecommendation?: {
    enabled: boolean;
    reason: string;
    video?: TopicVideo | null;
  } | null;
  learningNextStep?: unknown;
};

type TopicVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  embed_url: string;
  channel_name: string | null;
  duration_label: string | null;
};

function buildTutorShareUrl(message: Message, topicId: string | null, disciplineId: string | null) {
  const params = new URLSearchParams();
  params.set("share_tutor", "1");
  params.set("share_text", message.content.slice(0, 12000));
  if (topicId) params.set("topic_id", topicId);
  if (disciplineId) params.set("discipline_id", disciplineId);

  const image = message.visualAid?.image;
  if (message.visualAid?.enabled && image?.enabled && image.url) {
    params.set("share_image_url", image.url);
    params.set("share_image_alt", image.title || message.visualAid.title);
    if (image.sourceUrl) params.set("share_image_source_url", image.sourceUrl);
    if (image.license) params.set("share_image_license", image.license);
    if (image.attribution) params.set("share_image_attribution", image.attribution);
  }

  if (message.visualAid?.enabled) {
    params.set("share_visual_aid", JSON.stringify({
      enabled: true,
      type: message.visualAid.type,
      title: message.visualAid.title,
      items: message.visualAid.items,
      caption: message.visualAid.caption,
    }));
  }

  const video = message.videoRecommendation?.enabled ? message.videoRecommendation.video : null;
  if (video?.embed_url) {
    params.set("share_video_embed_url", video.embed_url);
    params.set("share_video_url", video.video_url);
    params.set("share_video_title", video.title);
    if (video.description) params.set("share_video_description", video.description);
    if (video.channel_name) params.set("share_video_channel", video.channel_name);
    if (video.duration_label) params.set("share_video_duration", video.duration_label);
    if (message.videoRecommendation?.reason) params.set("share_video_reason", message.videoRecommendation.reason);
  }

  return `/app/comunidade?${params.toString()}`;
}

type TutorReflection = {
  id: string;
  kind: "quote" | "reflection";
  text: string;
  author: string;
  source: string;
  sourceUrl?: string;
};

// Citações curtas com obra de referência e, quando disponível, ligação para consulta.
// As reflexões são textos autorais inspirados em ideias dos pensadores citados — não são
// apresentadas como palavras literais deles. Assim evitamos perpetuar falsas atribuições.
const TUTOR_REFLECTIONS: TutorReflection[] = [
  {
    id: "socrates-examined-life",
    kind: "quote",
    text: "Uma vida sem exame não merece ser vivida.",
    author: "Sócrates, conforme relatado por Platão",
    source: "Apologia de Sócrates, 38a",
    sourceUrl: "https://query.libretexts.org/Idioma_Portugues/Introducao_a_filosofia_%28OpenStax%29/01%3A_Introdu%C3%A7%C3%A3o_a_filosofia/1.03%3A_S%C3%B3crates_como_fil%C3%B3sofo_hist%C3%B3rico_paradigm%C3%A1tico",
  },
  {
    id: "aristotle-desire-to-know",
    kind: "quote",
    text: "Todos os seres humanos, por natureza, desejam conhecer.",
    author: "Aristóteles",
    source: "Metafísica, Livro I, 980a",
    sourceUrl: "https://openscriptorium.com/read/aristotle/066-metaphysics-book-i",
  },
  {
    id: "epictetus-judgments",
    kind: "quote",
    text: "Não são as coisas que nos perturbam, mas nossos juízos sobre elas.",
    author: "Epicteto",
    source: "Manual (Encheirídion), § 5 — tradução resumida",
    sourceUrl: "https://epictetus-enchiridion.org/en/quotecheck/not-things-but-judgments/",
  },
  {
    id: "seneca-time",
    kind: "quote",
    text: "Não é que tenhamos pouco tempo, mas que desperdiçamos muito dele.",
    author: "Sêneca",
    source: "Sobre a brevidade da vida, capítulo 1 — tradução livre",
    sourceUrl: "https://en.wikisource.org/wiki/On_the_Shortness_of_Life",
  },
  {
    id: "marcus-aurelius-thoughts",
    kind: "quote",
    text: "A felicidade da sua vida depende da qualidade dos seus pensamentos.",
    author: "Marco Aurélio",
    source: "Meditações, Livro V — tradução livre",
    sourceUrl: "https://www.gutenberg.org/files/2680/2680-h/2680-h.htm",
  },
  {
    id: "confucius-learning-thinking",
    kind: "quote",
    text: "Aprender sem pensar é inútil; pensar sem aprender é perigoso.",
    author: "Confúcio",
    source: "Analectos, 2.15 — tradução livre",
    sourceUrl: "https://classics.mit.edu/Confucius/analects.1.1.html",
  },
  {
    id: "laozi-first-step",
    kind: "quote",
    text: "Uma jornada de mil milhas começa debaixo dos pés.",
    author: "Laozi",
    source: "Dao De Jing, capítulo 64 — tradução livre",
    sourceUrl: "https://classics.mit.edu/Lao/taote.html",
  },
  {
    id: "descartes-cogito",
    kind: "quote",
    text: "Penso, logo existo.",
    author: "René Descartes",
    source: "Discurso do método, parte IV",
    sourceUrl: "https://www.gutenberg.org/files/59/59-h/59-h.htm",
  },
  {
    id: "rousseau-freedom",
    kind: "quote",
    text: "O homem nasce livre, mas por toda parte está acorrentado.",
    author: "Jean-Jacques Rousseau",
    source: "Do contrato social, Livro I, capítulo 1 — tradução livre",
    sourceUrl: "https://sourcebooks.web.fordham.edu/mod/rousseau-contract2.asp",
  },
  {
    id: "kant-sapere-aude",
    kind: "quote",
    text: "Ouse saber! Tenha coragem de servir-se do próprio entendimento.",
    author: "Immanuel Kant",
    source: "Resposta à pergunta: O que é o Esclarecimento? (1784) — tradução livre",
    sourceUrl: "https://sourcebooks.web.fordham.edu/mod/kant-whatis.asp",
  },
  {
    id: "nietzsche-dancing-star",
    kind: "quote",
    text: "É preciso ter caos dentro de si para dar à luz uma estrela dançante.",
    author: "Friedrich Nietzsche",
    source: "Assim falou Zaratustra, prólogo — tradução livre",
    sourceUrl: "https://www.gutenberg.org/files/1998/1998-h/1998-h.htm",
  },
  {
    id: "spinoza-understanding",
    kind: "quote",
    text: "Não rir, não lamentar nem detestar, mas compreender.",
    author: "Baruch de Spinoza",
    source: "Tratado político, capítulo I, § 4 — tradução livre",
    sourceUrl: "https://en.wikisource.org/wiki/Tractatus_Politicus/Chapter_I",
  },
  {
    id: "marx-change-world",
    kind: "quote",
    text: "Os filósofos apenas interpretaram o mundo de diferentes maneiras; o que importa é transformá-lo.",
    author: "Karl Marx",
    source: "Teses sobre Feuerbach, XI",
    sourceUrl: "https://pt.wikisource.org/wiki/Teses_sobre_Feuerbach",
  },
  {
    id: "beauvoir-becoming",
    kind: "quote",
    text: "Ninguém nasce mulher: torna-se mulher.",
    author: "Simone de Beauvoir",
    source: "O segundo sexo — tradução livre",
    sourceUrl: "https://www.jstor.org/stable/10.7312/baue11664",
  },
  {
    id: "freire-teaching",
    kind: "quote",
    text: "Ensinar não é transferir conhecimento, mas criar possibilidades para a sua produção.",
    author: "Paulo Freire",
    source: "Pedagogia da autonomia — formulação abreviada",
    sourceUrl: "https://dhnet.org.br/direitos/militantes/paulofreire/paulo_freire_pedagogia_do_oprimido.pdf",
  },
  {
    id: "freire-world-word",
    kind: "quote",
    text: "A leitura do mundo precede a leitura da palavra.",
    author: "Paulo Freire",
    source: "A importância do ato de ler",
    sourceUrl: "https://acervo.paulofreire.org/handle/7891/2842",
  },
  {
    id: "durkheim-education",
    kind: "quote",
    text: "A educação é a ação exercida pelas gerações adultas sobre aquelas que ainda não estão maduras para a vida social.",
    author: "Émile Durkheim",
    source: "Educação e sociologia — tradução livre",
    sourceUrl: "https://www.gutenberg.org/files/55501/55501-h/55501-h.htm",
  },
  {
    id: "arendt-natality",
    kind: "quote",
    text: "A essência da educação é a natalidade: o fato de que seres humanos nascem para o mundo.",
    author: "Hannah Arendt",
    source: "A crise na educação — tradução livre",
    sourceUrl: "https://revistas.usp.br/ep/pt_BR/article/view/28264",
  },
  {
    id: "bell-hooks-classroom",
    kind: "quote",
    text: "A sala de aula permanece como um dos espaços mais radicais de possibilidade.",
    author: "bell hooks",
    source: "Ensinando a transgredir — tradução livre",
    sourceUrl: "https://faculty.bard.edu/hhaggard/teaching/sci127Sp20/notes/hooksTeachingToTransgress1.pdf",
  },
  {
    id: "martin-luther-king-justice",
    kind: "quote",
    text: "A injustiça em qualquer lugar é uma ameaça à justiça em todo lugar.",
    author: "Martin Luther King Jr.",
    source: "Carta da prisão de Birmingham (1963) — tradução livre",
    sourceUrl: "https://letterfromjail.com/",
  },
  {
    id: "mandela-education",
    kind: "quote",
    text: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.",
    author: "Nelson Mandela",
    source: "Fundação Nelson Mandela — tradução livre",
    sourceUrl: "https://www.nelsonmandela.org/nm100-education",
  },
  {
    id: "bacon-knowledge",
    kind: "quote",
    text: "O conhecimento em si é poder.",
    author: "Francis Bacon",
    source: "Meditationes Sacrae, De Hæresibus (1597) — tradução livre",
    sourceUrl: "https://quotle.info/who-said/knowledge-itself-is-power/",
  },
  {
    id: "wittgenstein-silence",
    kind: "quote",
    text: "Sobre aquilo de que não se pode falar, deve-se calar.",
    author: "Ludwig Wittgenstein",
    source: "Tractatus Logico-Philosophicus, proposição 7 — tradução livre",
    sourceUrl: "https://www.wittgensteinproject.org/w/index.php/Tractatus_Logico-Philosophicus_%28static_tree-like_view%29",
  },
  {
    id: "vygotsky-learning",
    kind: "reflection",
    text: "O apoio certo não substitui o esforço do estudante: amplia o que ele consegue alcançar até que o apoio deixe de ser necessário.",
    author: "Reflexão inspirada em Lev Vygotsky",
    source: "Tema: mediação e zona de desenvolvimento proximal. Não é uma citação literal.",
    sourceUrl: "https://www.marxists.org/archive/vygotsky/works/1934/thought-language/ch06.htm",
  },
  {
    id: "plato-cave",
    kind: "reflection",
    text: "Às vezes, o que nos limita não é a falta de luz, mas o apego às sombras que já aprendemos a reconhecer.",
    author: "Reflexão inspirada em Platão",
    source: "Tema: sair da caverna das aparências — A República, Livro VII. Não é uma citação literal.",
    sourceUrl: "https://classics.mit.edu/Plato/republic.7.vi.html",
  },
  {
    id: "heraclitus-change",
    kind: "reflection",
    text: "Uma mente que nunca muda de ideia pode parecer firme; talvez apenas tenha parado de observar o mundo.",
    author: "Reflexão inspirada em Heráclito",
    source: "Tema: mudança e devir — fragmentos de Heráclito. Não é uma citação literal.",
    sourceUrl: "https://plato.stanford.edu/entries/heraclitus/",
  },
  {
    id: "epicurus-enough",
    kind: "reflection",
    text: "Nem todo prazer enriquece a vida, e nem toda renúncia a empobrece: sabedoria é descobrir o que realmente basta.",
    author: "Reflexão inspirada em Epicuro",
    source: "Tema: prazer, serenidade e desejos — Carta a Meneceu. Não é uma citação literal.",
    sourceUrl: "https://classics.mit.edu/Epicurus/menoec.html",
  },
  {
    id: "augustine-search",
    kind: "reflection",
    text: "Respostas emprestadas podem acalmar por um instante; compreender o que buscamos exige coragem para olhar para dentro.",
    author: "Reflexão inspirada em Agostinho de Hipona",
    source: "Tema: interioridade e busca — Confissões. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/3296/3296-h/3296-h.htm",
  },
  {
    id: "aquinas-reason",
    kind: "reflection",
    text: "Pensar com profundidade é distinguir o que sabemos, o que inferimos e o que ainda não temos razões para afirmar.",
    author: "Reflexão inspirada em Tomás de Aquino",
    source: "Tema: razão, argumento e conhecimento — Suma Teológica. Não é uma citação literal.",
    sourceUrl: "https://www.newadvent.org/summa/",
  },
  {
    id: "hobbes-common-life",
    kind: "reflection",
    text: "A vida em comum não depende apenas de boas intenções; depende também das regras que tornam a confiança possível.",
    author: "Reflexão inspirada em Thomas Hobbes",
    source: "Tema: pacto social e ordem política — Leviatã. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/3207/3207-h/3207-h.htm",
  },
  {
    id: "locke-experience",
    kind: "reflection",
    text: "Uma convicção merece ser examinada não apenas pela força com que a sentimos, mas pelas experiências que a sustentam.",
    author: "Reflexão inspirada em John Locke",
    source: "Tema: experiência e conhecimento — Ensaio acerca do entendimento humano. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/10615/10615-h/10615-h.htm",
  },
  {
    id: "hume-evidence",
    kind: "reflection",
    text: "A mente honesta não pergunta somente se uma ideia parece convincente; pergunta que evidência poderia fazê-la mudar.",
    author: "Reflexão inspirada em David Hume",
    source: "Tema: evidência, hábito e ceticismo — Investigação sobre o entendimento humano. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/9662/9662-h/9662-h.htm",
  },
  {
    id: "mill-liberty",
    kind: "reflection",
    text: "Uma sociedade perde quando transforma toda divergência em ameaça: ideias precisam de espaço para ser testadas e criticadas.",
    author: "Reflexão inspirada em John Stuart Mill",
    source: "Tema: liberdade de pensamento e debate — Sobre a liberdade. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/34901/34901-h/34901-h.htm",
  },
  {
    id: "william-james-action",
    kind: "reflection",
    text: "Uma ideia começa a mostrar seu valor quando muda o modo como prestamos atenção, decidimos e agimos.",
    author: "Reflexão inspirada em William James",
    source: "Tema: experiência e pragmatismo — Pragmatismo. Não é uma citação literal.",
    sourceUrl: "https://www.gutenberg.org/files/5116/5116-h/5116-h.htm",
  },
  {
    id: "weber-responsibility",
    kind: "reflection",
    text: "Ter boas intenções importa; examinar as consequências do que fazemos também é parte da responsabilidade.",
    author: "Reflexão inspirada em Max Weber",
    source: "Tema: ética da responsabilidade — A política como vocação. Não é uma citação literal.",
  },
  {
    id: "bourdieu-inequality",
    kind: "reflection",
    text: "O que parece talento natural pode esconder anos de oportunidade, familiaridade e apoio que nem todos tiveram.",
    author: "Reflexão inspirada em Pierre Bourdieu",
    source: "Tema: capital cultural e reprodução social. Não é uma citação literal.",
  },
  {
    id: "foucault-power",
    kind: "reflection",
    text: "Aprender também é perguntar quem definiu as regras, quem se beneficia delas e quem tem permissão para contestá-las.",
    author: "Reflexão inspirada em Michel Foucault",
    source: "Tema: saber, poder e instituições. Não é uma citação literal.",
  },
  {
    id: "morin-complexity",
    kind: "reflection",
    text: "A complexidade não torna o mundo impossível de compreender; lembra que uma resposta simples pode deixar de fora o essencial.",
    author: "Reflexão inspirada em Edgar Morin",
    source: "Tema: pensamento complexo. Não é uma citação literal.",
    sourceUrl: "https://unesdoc.unesco.org/ark:/48223/pf0000117740",
  },
  {
    id: "vygotsky-support",
    kind: "reflection",
    text: "O apoio certo não faz o caminho pelo estudante: torna possível alcançar hoje aquilo que amanhã ele fará com autonomia.",
    author: "Reflexão inspirada em Lev Vygotsky",
    source: "Tema: mediação e zona de desenvolvimento proximal. Não é uma citação literal.",
  },
  {
    id: "piaget-understanding",
    kind: "reflection",
    text: "Compreender não é repetir a descoberta de outra pessoa; é reconstruir as relações que fazem aquela descoberta ter sentido.",
    author: "Reflexão inspirada em Jean Piaget",
    source: "Tema: construção do conhecimento. Não é uma citação literal.",
  },
  {
    id: "montessori-autonomy",
    kind: "reflection",
    text: "A autonomia cresce quando o ambiente oferece ferramentas adequadas, desafios possíveis e espaço real para tentar de novo.",
    author: "Reflexão inspirada em Maria Montessori",
    source: "Tema: autonomia e ambiente preparado. Não é uma citação literal.",
  },
  {
    id: "dewey-experience",
    kind: "reflection",
    text: "Viver uma experiência não garante aprender com ela; a aprendizagem nasce quando examinamos o que aconteceu e o que faremos diferente.",
    author: "Reflexão inspirada em John Dewey",
    source: "Tema: experiência e reflexão — Democracia e educação. Não é uma citação literal.",
  },
  {
    id: "rubem-alves-curiosity",
    kind: "reflection",
    text: "A curiosidade floresce quando o conhecimento deixa de ser uma lista de obrigações e se torna uma maneira nova de enxergar o cotidiano.",
    author: "Reflexão inspirada em Rubem Alves",
    source: "Tema: desejo de aprender e educação. Não é uma citação literal.",
  },
  {
    id: "clovis-happiness",
    kind: "reflection",
    text: "Talvez a pergunta sobre felicidade não seja apenas 'o que me falta?', mas 'o que faço com aquilo que digo valorizar?'.",
    author: "Reflexão inspirada nas aulas de Clóvis de Barros Filho",
    source: "Tema: felicidade, ética e escolhas. Texto autoral, não é citação literal.",
  },
  {
    id: "milton-santos-space",
    kind: "reflection",
    text: "O lugar onde vivemos não é apenas cenário: revela decisões, desigualdades e possibilidades que organizam a vida coletiva.",
    author: "Reflexão inspirada em Milton Santos",
    source: "Tema: espaço geográfico e cidadania — Por uma outra globalização. Não é uma citação literal.",
  },
  {
    id: "djamila-ribeiro-listening",
    kind: "reflection",
    text: "Ouvir quem foi colocado à margem amplia o mapa da realidade; não elimina a crítica, torna a crítica mais responsável.",
    author: "Reflexão inspirada em Djamila Ribeiro",
    source: "Tema: lugar de fala e produção do conhecimento. Não é uma citação literal.",
  },
  {
    id: "angela-davis-action",
    kind: "reflection",
    text: "A indignação ganha força ética quando deixa de ser apenas sentimento e se transforma em compromisso com mudanças concretas.",
    author: "Reflexão inspirada em Angela Davis",
    source: "Tema: justiça social, liberdade e ação coletiva. Não é uma citação literal.",
  },
  {
    id: "fanon-recognition",
    kind: "reflection",
    text: "Não existe compreensão completa de uma sociedade sem perguntar como ela distribui humanidade, voz e reconhecimento.",
    author: "Reflexão inspirada em Frantz Fanon",
    source: "Tema: colonialismo, identidade e reconhecimento. Não é uma citação literal.",
  },
  {
    id: "krenak-progress",
    kind: "reflection",
    text: "O progresso merece ser interrogado quando exige tratar pessoas, comunidades e natureza como coisas descartáveis.",
    author: "Reflexão inspirada em Ailton Krenak",
    source: "Tema: humanidade, natureza e futuro — Ideias para adiar o fim do mundo. Não é uma citação literal.",
  },
  {
    id: "sagan-doubt",
    kind: "reflection",
    text: "A dúvida bem formulada não diminui o encanto de descobrir; protege a curiosidade contra certezas que recusam qualquer prova.",
    author: "Reflexão inspirada em Carl Sagan",
    source: "Tema: pensamento científico e ceticismo. Não é uma citação literal.",
  },
  {
    id: "curie-evidence",
    kind: "reflection",
    text: "A coragem de investigar precisa caminhar junto com a humildade de reconhecer quando os dados ainda não permitem uma conclusão.",
    author: "Reflexão inspirada em Marie Curie",
    source: "Tema: investigação científica e rigor. Não é uma citação literal.",
  },
  {
    id: "russell-certainty",
    kind: "reflection",
    text: "Pensar criticamente exige examinar uma crença querida com o mesmo rigor que aplicamos à crença de quem discorda de nós.",
    author: "Reflexão inspirada em Bertrand Russell",
    source: "Tema: lógica, dúvida e pensamento crítico. Não é uma citação literal.",
  },
  {
    id: "frankl-meaning",
    kind: "reflection",
    text: "Buscar sentido não transforma a dor em algo bom; pode ajudar a escolher uma resposta digna diante daquilo que não controlamos.",
    author: "Reflexão inspirada em Viktor Frankl",
    source: "Tema: sentido e responsabilidade — Em busca de sentido. Não é uma citação literal.",
  },
  {
    id: "malala-education",
    kind: "reflection",
    text: "Quando uma pessoa conquista acesso à educação, não ganha apenas informação: ganha novas perguntas, escolhas e possibilidades de participação.",
    author: "Reflexão inspirada em Malala Yousafzai",
    source: "Tema: educação como direito e voz pública. Não é uma citação literal.",
  },
  {
    id: "simone-weil-attention",
    kind: "reflection",
    text: "Prestar atenção de verdade é uma forma de respeito: suspendemos por um momento a vontade de responder para conseguir compreender.",
    author: "Reflexão inspirada em Simone Weil",
    source: "Tema: atenção e responsabilidade. Não é uma citação literal.",
  },
  {
    id: "benjamin-history",
    kind: "reflection",
    text: "Conhecer o passado não é decorar uma fila de datas; é perceber como escolhas antigas ainda distribuem oportunidades e limites no presente.",
    author: "Reflexão inspirada em Walter Benjamin",
    source: "Tema: memória e história. Não é uma citação literal.",
  },
  {
    id: "gramsci-hope",
    kind: "reflection",
    text: "Realismo sem esperança vira resignação; esperança sem análise vira fantasia. A transformação precisa da lucidez dos dois.",
    author: "Reflexão inspirada em Antonio Gramsci",
    source: "Tema: cultura, política e ação histórica. Não é uma citação literal.",
  },
  {
    id: "sen-capabilities",
    kind: "reflection",
    text: "Uma sociedade não deve ser avaliada só pelo que produz, mas pelas liberdades reais que as pessoas têm para escolher a vida que valorizam.",
    author: "Reflexão inspirada em Amartya Sen",
    source: "Tema: capacidades e desenvolvimento humano. Não é uma citação literal.",
  },
  {
    id: "nussbaum-empathy",
    kind: "reflection",
    text: "Imaginar a vida de outra pessoa não exige concordar com tudo; exige reconhecer que a experiência alheia também merece ser compreendida.",
    author: "Reflexão inspirada em Martha Nussbaum",
    source: "Tema: emoções, empatia e justiça. Não é uma citação literal.",
  },
  {
    id: "freire-dialogue",
    kind: "reflection",
    text: "O diálogo não é uma disputa para ver quem termina com a última palavra; é um trabalho conjunto para chegar a uma compreensão melhor.",
    author: "Reflexão inspirada em Paulo Freire",
    source: "Tema: diálogo e educação problematizadora. Não é uma citação literal.",
  },
  {
    id: "king-courage",
    kind: "reflection",
    text: "Coragem não é ausência de receio: é decidir que um princípio importante vale mais do que o conforto de permanecer calado.",
    author: "Reflexão inspirada em Martin Luther King Jr.",
    source: "Tema: consciência moral e ação cívica. Não é uma citação literal.",
  },
  {
    id: "mandela-reconciliation",
    kind: "reflection",
    text: "Reconstruir uma comunidade não significa apagar o passado; significa impedir que a lembrança da injustiça seja usada para perpetuá-la.",
    author: "Reflexão inspirada em Nelson Mandela",
    source: "Tema: reconciliação, justiça e vida pública. Não é uma citação literal.",
  },
  {
    id: "aristotle-habits",
    kind: "reflection",
    text: "O caráter se forma menos nos ideais que admiramos e mais nos pequenos hábitos que repetimos quando ninguém está avaliando.",
    author: "Reflexão inspirada em Aristóteles",
    source: "Tema: virtude e hábito — Ética a Nicômaco. Não é uma citação literal.",
  },
  {
    id: "confucius-practice",
    kind: "reflection",
    text: "O conhecimento amadurece quando aquilo que entendemos hoje muda, mesmo que discretamente, a maneira como agimos amanhã.",
    author: "Reflexão inspirada em Confúcio",
    source: "Tema: aprendizagem, prática e exemplo — Analectos. Não é uma citação literal.",
  },
]; 

const TUTOR_REFLECTION_CYCLE_KEY = "ensina-me:tutor:reflection-cycle:v2";
const TUTOR_REFLECTION_LAST_KEY = "ensina-me:tutor:last-reflection";
let lastTutorReflectionInMemory: string | null = null;

function chooseTutorReflection(): TutorReflection {
  let seenIds: string[] = [];
  let previousId = lastTutorReflectionInMemory;

  try {
    const rawCycle = window.localStorage.getItem(TUTOR_REFLECTION_CYCLE_KEY);
    if (rawCycle) {
      const parsed: unknown = JSON.parse(rawCycle);
      if (Array.isArray(parsed)) {
        seenIds = parsed.filter((id): id is string => typeof id === "string");
      }
    }
    previousId = window.localStorage.getItem(TUTOR_REFLECTION_LAST_KEY) ?? previousId;
  } catch {
    // O Tutor continua funcionando mesmo se o navegador bloquear o armazenamento local.
  }

  let available = TUTOR_REFLECTIONS.filter((reflection) => !seenIds.includes(reflection.id));
  if (available.length === 0) {
    seenIds = [];
    available = [...TUTOR_REFLECTIONS];
  }

  if (available.length > 1 && previousId) {
    const withoutPrevious = available.filter((reflection) => reflection.id !== previousId);
    if (withoutPrevious.length > 0) available = withoutPrevious;
  }

  const selected = available[Math.floor(Math.random() * available.length)] ?? TUTOR_REFLECTIONS[0]!;
  lastTutorReflectionInMemory = selected.id;

  try {
    const nextSeen = [...new Set([...seenIds, selected.id])];
    window.localStorage.setItem(TUTOR_REFLECTION_CYCLE_KEY, JSON.stringify(nextSeen));
    window.localStorage.setItem(TUTOR_REFLECTION_LAST_KEY, selected.id);
  } catch {
    // A seleção aleatória ainda funciona sem armazenamento persistente.
  }

  return selected;
}

function TutorMessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const renderInline = (value: string) =>
    value.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
        : <span key={partIndex}>{part}</span>
    );

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
        const bullet = trimmed.match(/^[-•]\s+(.+)$/);
        const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);

        if (heading) {
          return <p key={index} className="pt-1 font-black text-[#172334]">{renderInline(heading[1])}</p>;
        }
        if (bullet) {
          return <div key={index} className="flex gap-2 pl-1"><span aria-hidden="true">•</span><span>{renderInline(bullet[1])}</span></div>;
        }
        if (numbered) {
          return <div key={index} className="flex gap-2 pl-1"><span className="font-bold">{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></div>;
        }
        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}


function getClientVisualFallback(request: string, response: string): VisualAid | null {
  const text = `${request} ${response}`.toLowerCase();
  const asksForVisual = /(imagem|visual|diagrama|figura|esquema)/.test(text);
  const isPhotosynthesis = /(fotossíntese|fotossintese|photosynthesis)/.test(text);
  if (!asksForVisual || !isPhotosynthesis) return null;

  return {
    enabled: true,
    type: "flow",
    title: "Processo da fotossíntese",
    items: [
      "A planta capta água pelas raízes e dióxido de carbono do ar.",
      "A luz solar fornece energia para as reações fotossintéticas.",
      "Nas folhas, a clorofila participa da conversão dessa energia.",
      "A planta produz glicose e libera oxigênio como resultado do processo.",
    ],
    caption: "Imagem pública em CC0, usada como apoio didático.",
    image: {
      enabled: true,
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Photosynthesis%20pt.svg?width=1280",
      title: "Diagrama com o processo geral da fotossíntese",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Photosynthesis_pt.svg",
      license: "CC BY-SA 4.0",
      attribution: "Wikimedia Commons",
    },
  };
}

function TutorPage() {
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseNames, setCourseNames] = useState<string[]>([]);
  const [reflection] = useState<TutorReflection>(() =>
    typeof window === "undefined" ? TUTOR_REFLECTIONS[0]! : chooseTutorReflection()
  );

  async function downloadVisualImage(image: NonNullable<VisualAid["image"]>) {
    try {
      const response = await fetch(image.url, { mode: "cors" });
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = image.title.replace(/[^a-z0-9áàâãéêíóôõúçñ_-]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "apoio-visual";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(image.url, "_blank", "noopener,noreferrer");
    }
  }

  function VideoRecommendation({ recommendation }: { recommendation: NonNullable<Message["videoRecommendation"]> }) {
    const video = recommendation.video;
    if (!recommendation.enabled || !video) return null;

    return (
      <div className="mt-5 rounded-2xl border border-[#DCE5F0] bg-white p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Vídeo recomendado</p>
        <h3 className="mt-1 text-sm font-black text-[#172334]">Quer aprofundar exatamente o que você perguntou?</h3>
        {recommendation.reason && (
          <p className="mt-2 text-xs leading-5 text-[#687688]">{recommendation.reason}</p>
        )}
        <article className="mt-4 overflow-hidden rounded-xl border border-[#E3EAF3] bg-[#F8FAFC]">
          <div className="aspect-video bg-black">
            <iframe
              src={video.embed_url}
              title={video.title}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <p className="text-sm font-black text-[#172334]">{video.title}</p>
            {(video.channel_name || video.duration_label) && (
              <p className="mt-1 text-xs text-[#687688]">
                {[video.channel_name, video.duration_label].filter(Boolean).join(" · ")}
              </p>
            )}
            {video.description && (
              <p className="mt-2 text-xs leading-5 text-[#687688]">{video.description}</p>
            )}
            <a
              href={video.video_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-black text-[#0242D7] hover:underline"
            >
              Abrir vídeo na fonte original ↗
            </a>
          </div>
        </article>
      </div>
    );
  }

  function VisualAidCard({ visualAid }: { visualAid: VisualAid }) {
    if (!visualAid.enabled) return null;

    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#CFE0FF] bg-white">
        <div className="border-b border-[#E3ECFA] bg-[#F4F8FF] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Apoio visual</p>
          <h3 className="mt-1 text-sm font-black text-[#172334]">{visualAid.title}</h3>
        </div>

        <div className="p-4 sm:p-5">
          {visualAid.image?.enabled && visualAid.image.url && (
            <figure className="overflow-hidden rounded-xl border border-[#DCE5F0] bg-white">
              <div className="flex min-h-[280px] items-center justify-center bg-[#F8FAFC] p-2 sm:min-h-[440px]">
                <img
                  src={visualAid.image.url}
                  alt={visualAid.image.title || visualAid.title}
                  className="block max-h-[680px] w-full object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <figcaption className="border-t border-[#E5EAF0] px-3 py-2 text-[11px] leading-5 text-[#687688]">
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{visualAid.image.attribution} · {visualAid.image.license}</span>
                </span>
                <span className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void downloadVisualImage(visualAid.image!)}
                    className="font-black text-[#0242D7] hover:underline"
                  >
                    Baixar imagem
                  </button>
                  <a
                  href={visualAid.image.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#0242D7] hover:underline"
                >
                    Fonte da imagem
                  </a>
                </span>
              </figcaption>
            </figure>
          )}

          {visualAid.items.length > 0 && (
            <div className={visualAid.image?.enabled ? "mt-5" : ""}>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#687688]">
                Etapas principais
              </p>
              {visualAid.type === "comparison" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visualAid.items.map((item, index) => (
                    <div
                      key={item + index}
                      className="rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-3 text-sm font-semibold leading-6 text-[#334155]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <ol className="space-y-2">
                  {visualAid.items.map((item, index) => (
                    <li
                      key={item + index}
                      className="flex gap-3 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#334155]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-xs font-black text-[#0242D7]">
                        {index + 1}
                      </span>
                      <span className="font-semibold">{item}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {visualAid.caption && (
            <p className="mt-4 text-xs leading-5 text-[#687688]">{visualAid.caption}</p>
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setLoading(false);
        return;
      }

      // Render the Tutor shell immediately; personalize its context as data arrives.
      setLoading(false);

      // Recommendation and course membership do not depend on each other.
      const [recommendationData, membershipResult] = await Promise.all([
        LearningEngine.getRecommendation().catch(() => null),
        supabase.from("student_courses").select("course_id").order("created_at", { ascending: true }),
      ]);
      setRecommendation(recommendationData);

      const courseIds = (membershipResult.data ?? []).map((item) => item.course_id).filter(Boolean);
      if (courseIds.length > 0) {
        const [courseResult, firstDisciplineResult] = await Promise.all([
          supabase.from("courses").select("id, name").in("id", courseIds).eq("published", true).order("name", { ascending: true }),
          !recommendationData?.topic_id
            ? supabase.from("disciplines").select("id").in("course_id", courseIds).eq("published", true).order("curriculum_order", { ascending: true, nullsFirst: false }).limit(1)
            : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
        ]);
        setCourseNames((courseResult.data ?? []).map((course) => course.name));

        if (recommendationData?.topic_id) {
          setTopicId(recommendationData.topic_id);
        } else {
          const disciplineId = firstDisciplineResult.data?.[0]?.id;
          // Let the Tutor shell become interactive before resolving optional fallback context.
          setLoading(false);
          if (disciplineId) {
            const { data: topics } = await supabase
              .from("topics")
              .select("id")
              .eq("discipline_id", disciplineId)
              .eq("published", true)
              .order("position", { ascending: true })
              .limit(1);
            setTopicId(topics?.[0]?.id ?? null);
          } else {
            setTopicId(null);
          }
        }
      } else {
        setCourseNames([]);
        setTopicId(recommendationData?.topic_id ?? null);
      }

      setLoading(false);
    })();
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Este navegador não permite gravar áudio. Verifique as permissões do microfone."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const chunks: BlobPart[] = [];
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); setMediaRecorder(null); setError("Não foi possível gravar o áudio. Tente novamente."); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop()); setRecording(false); setMediaRecorder(null);
        if (blob.size > MAX_TUTOR_AUDIO_BYTES) { setError("O áudio gravado ultrapassou 6 MB. Grave um trecho menor."); return; }
        if (blob.size > 0) { const mt = blob.type || "audio/webm"; const audio = new File([blob], "mensagem-tutor." + audioExtensionForMime(mt), { type: mt }); void send(undefined, audio); }
      };
      recorder.start(250); setMediaRecorder(recorder); setRecording(true); setError(null);
    } catch { setError("Permita o acesso ao microfone para gravar sua mensagem."); }
  }

  function stopRecording() { if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop(); }

  async function send(event?: FormEvent, recordedAudio?: File) {
    event?.preventDefault();
    const message = input.trim();
    const outgoingAudio = recordedAudio ?? audioFile;
    if (sending || (recording && !recordedAudio)) return;
    if (!message && !outgoingAudio && !imageFile) return;
    if (!topicId) {
      setError("Abra um tópico de estudo primeiro para que o Tutor tenha contexto acadêmico.");
      return;
    }
    if (outgoingAudio && outgoingAudio.size > MAX_TUTOR_AUDIO_BYTES) {
      setError("O áudio deve ter no máximo 6 MB.");
      return;
    }
    if (imageFile && imageFile.size > MAX_TUTOR_IMAGE_BYTES) {
      setError("A imagem deve ter no máximo 4 MB.");
      return;
    }

    setSending(true);
    setError(null);
    setInput("");
    const displayText = [message, outgoingAudio ? "🎙️ Transcrevendo mensagem de voz…" : ""].filter(Boolean).join("\n") || (imageFile ? "Imagem enviada para análise" : "Mensagem enviada.");
    const userMessageId = crypto.randomUUID();
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;
    setMessages((current) => [...current, { id: userMessageId, role: "user", content: displayText, imageUrl }]);

    try {
      const [audioBase64, imageBase64] = await Promise.all([
        outgoingAudio ? fileToBase64(outgoingAudio) : Promise.resolve(null),
        imageFile ? fileToBase64(imageFile) : Promise.resolve(null),
      ]);
      const { data, error: invokeError } = await supabase.functions.invoke("ai-tutor-media-preview", {
        body: {
          action: "chat",
          topic_id: topicId,
          message,
          conversation_id: conversationId,
          audio: outgoingAudio ? { data: audioBase64, mime_type: getAudioMimeType(outgoingAudio) || "audio/webm", file_name: outgoingAudio.name } : null,
          image: imageFile ? { data: imageBase64, mime_type: getImageMimeType(imageFile), file_name: imageFile.name } : null,
        },
      });

    if (invokeError || data?.error) {
      setMessages((current) => current.map((item) => item.id === userMessageId ? { ...item, content: outgoingAudio ? "🎙️ Áudio enviado. A transcrição não ficou disponível." : item.content } : item));
      setInput(message);
      setError(data?.error ?? invokeError?.message ?? "O Tutor não conseguiu responder agora. Tente novamente.");
    } else if (data?.message) {
      if (typeof data.transcription === "string" && data.transcription.trim()) {
        setMessages((current) => current.map((item) => item.id === userMessageId
          ? { ...item, content: [message, data.transcription.trim()].filter(Boolean).join("\n") }
          : item));
      }
      if (typeof data.conversation_id === "string" && data.conversation_id.trim()) {
        setConversationId(data.conversation_id);
      }

      const clientVisualFallback = getClientVisualFallback(message, data.message);
      const backendVisualAid = data.visual_aid as VisualAid | null | undefined;
      const visualAid = backendVisualAid
        ? {
            ...backendVisualAid,
            image: backendVisualAid.image ?? clientVisualFallback?.image ?? null,
          }
        : clientVisualFallback;

      const assistantMessageId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: data.message,
          shareable: data.shareable === true,
          visualAid,
          videoRecommendation: data.video_recommendation ?? null,
          learningNextStep: data.learning_next_step ?? null,
        },
      ]);
      setAudioFile(null);
      setImageFile(null);
    } else {
      setError("O Tutor recebeu a mensagem, mas não retornou uma resposta válida. Tente novamente.");
    }

    } catch (sendError) {
      console.error("[Ensina-me] Falha inesperada ao enviar mensagem ao Tutor.", sendError);
      setMessages((current) => current.map((item) => item.id === userMessageId ? { ...item, content: outgoingAudio ? "🎙️ Áudio enviado. Não foi possível obter a transcrição." : item.content } : item));
      setInput(message);
      setError(sendError instanceof Error ? sendError.message : "A comunicação com o Tutor falhou. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="tutor-title">
      <header className="border-b border-[#DCE5F0] pb-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Tutor</p>
        <h1 id="tutor-title" className="mt-2 text-[32px] font-black tracking-[-0.04em] text-[#172334] sm:text-[42px]">Aprenda com contexto.</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688]">
          O Tutor usa os cursos do seu perfil, seu percurso e seu desempenho para explicar, comparar, corrigir raciocínios e orientar a próxima prática.
        </p>
      </header>

      <div className="tutor-layout-grid mt-7 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <section className="tutor-chat-shell rounded-2xl border border-border bg-card text-card-foreground shadow-[0_8px_28px_rgba(15,23,42,.05)]">
          <div className="min-h-[360px] space-y-4 p-5 sm:p-7">
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
            ) : messages.length === 0 ? (
              <div className="max-w-xl">
                <p className="text-sm font-extrabold text-[#0242D7]">Comece pelo que você não entendeu.</p>
                <h2 className="mt-2 text-xl font-black text-[#172334]">Pergunte “por que eu errei?”, peça um exemplo ou compare dois conceitos.</h2>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-[#0242D7] px-4 py-3 text-sm leading-6 text-white" : message.visualAid?.enabled ? "w-full rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#273547]" : "max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#273547]"}>
                {message.role === "assistant" ? <TutorMessageContent content={message.content} /> : (<><>{message.imageUrl && <img src={message.imageUrl} alt="Imagem enviada ao Tutor" className="mb-3 max-h-72 max-w-full rounded-xl object-contain" />}</><p className="whitespace-pre-wrap">{message.content}</p></>)}
                {message.role === "assistant" && message.visualAid?.enabled && (
                  <VisualAidCard visualAid={message.visualAid} />
                )}
                {message.role === "assistant" && message.videoRecommendation?.enabled && (
                  <VideoRecommendation recommendation={message.videoRecommendation} />
                )}
                {message.role === "assistant" && message.learningNextStep?.enabled && (
                  <div className="mt-5 rounded-2xl border border-[#CFE0FF] bg-[#F4F8FF] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Próximo passo para você</p>
                    <p className="mt-1 text-sm font-black text-[#172334]">{message.learningNextStep.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[#687688]">{message.learningNextStep.reason}</p>
                    <button type="button" onClick={() => setInput(message.learningNextStep.prompt)} className="mt-4 rounded-xl bg-[#0242D7] px-4 py-2.5 text-xs font-black text-white">
                      Praticar agora
                    </button>
                  </div>
                )}
                {message.role === "assistant" && message.shareable === true && (
                  <a
                    href={buildTutorShareUrl(message, topicId, recommendation?.discipline_id ?? null)}
                    className="mt-3 inline-flex text-xs font-bold text-[#0242D7] hover:underline"
                  >
                    Compartilhar esta explicação
                  </a>
                )}
              </div>
            ))}
            {sending && <div className="max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#718096]">O Tutor está pensando…</div>}
          </div>

          <form onSubmit={(event) => void send(event)} className="border-t border-border/60 bg-transparent p-3 sm:p-4">
            <label htmlFor="tutor-message" className="sr-only">Mensagem para o Tutor</label>
            {recording && <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-[#D92D20]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#D92D20]" />Gravando sua mensagem…</div>}
            {imageFile && (
              <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-semibold">Imagem selecionada <button type="button" aria-label="Remover imagem" onClick={() => setImageFile(null)} className="font-black">×</button></span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-2 shadow-sm transition focus-within:border-[#0242D7]">
              <button type="button" onClick={() => document.getElementById("tutor-image-file")?.click()} disabled={loading || sending || recording} title="Anexar imagem ou arquivo" aria-label="Anexar imagem ou arquivo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <input id="tutor-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={loading || sending} onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; event.currentTarget.value = ""; if (file && file.size > MAX_TUTOR_IMAGE_BYTES) { setError("A imagem deve ter no máximo 4 MB."); return; } if (file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(getImageMimeType(file))) { setError("Use uma imagem JPG, PNG, WebP ou GIF."); return; } setImageFile(file); setError(null); }} />
              <input id="tutor-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mensagem para o Tutor…" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" disabled={loading || sending || recording} />
              {!recording ? (
                <button type="button" onClick={() => void startRecording()} disabled={loading || sending} title="Gravar mensagem de voz" aria-label="Gravar mensagem de voz" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-[#0242D7] disabled:opacity-40">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>
                </button>
              ) : (
                <button type="button" onClick={stopRecording} title="Concluir gravação" aria-label="Concluir gravação" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEE4E2] text-[#B42318] transition hover:bg-[#FECDCA]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>
                </button>
              )}
              <button type="submit" title="Enviar mensagem" aria-label="Enviar mensagem" disabled={loading || sending || recording || (!input.trim() && !imageFile)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0242D7] text-white transition hover:bg-[#0036B5] disabled:cursor-not-allowed disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>
              </button>
            </div>
            <p className="mt-2 px-2 text-[11px] leading-4 text-muted-foreground">Áudio até 6 MB · Imagem até 4 MB. Os anexos são processados para responder à sua dúvida, sem serem publicados.</p>
            {error && <p className="mt-3 px-2 text-xs font-bold text-[#B42318]" role="alert">{error}</p>}
          </form>
        </section>

        <aside className="tutor-reflection-shell flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5">
          <figure className="tutor-reflection-card flex w-full min-h-0 flex-1 flex-col justify-center rounded-2xl border border-border bg-muted/40 p-5 text-card-foreground sm:p-6">
            <p className="tutor-reflection-label text-[10px] font-black uppercase tracking-[0.14em] text-primary">
              {reflection.kind === "quote" ? "Palavras de um pensador" : "Uma ideia para levar com você"}
            </p>
            <blockquote className="tutor-reflection-quote mt-4 text-lg font-semibold leading-8 text-foreground sm:text-xl sm:leading-9">
              {reflection.kind === "quote" ? `“${reflection.text}”` : reflection.text}
            </blockquote>
            <figcaption className="tutor-reflection-author mt-5 text-sm font-extrabold text-foreground">
              {reflection.author}
            </figcaption>
            <p className="tutor-reflection-source mt-2 text-xs leading-5 text-muted-foreground">
              {reflection.source}
              {reflection.sourceUrl && (
                <>
                  {" · "}
                  <a href={reflection.sourceUrl} target="_blank" rel="noreferrer" className="tutor-reflection-link font-bold text-primary underline-offset-4 hover:underline">
                    Consultar fonte ↗
                  </a>
                </>
              )}
            </p>
          </figure>
        </aside>
      </div>
    </section>
  );
}
