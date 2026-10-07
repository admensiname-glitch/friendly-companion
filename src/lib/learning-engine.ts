import { supabase } from "@/integrations/supabase/client";

export type StudyReason = "assessment" | "review" | "continue" | "start" | "none";

export interface LearningSnapshot {
  topicId: string;
  attempts: number;
  correct: number;
  accuracy: number;
  bestScore: number | null;
  lastActivityAt: string | null;
  nextReviewAt: string | null;
  mastery: string | null;
  difficulty: string | null;
}

export interface StudyRecommendation {
  topic_id: string | null;
  discipline_id?: string | null;
  topic_name?: string | null;
  discipline_name?: string | null;
  reason: StudyReason;
  message?: string | null;
  exam_date?: string | null;
  exam_type?: string | null;
}

export const LearningEngine = {
  async getRecommendation(): Promise<StudyRecommendation | null> {
    const { data, error } = await supabase.rpc("get_student_study_recommendation");
    if (error) throw error;
    return (data ?? null) as StudyRecommendation | null;
  },

  async getReviewItems() {
    const { data, error } = await supabase.rpc("get_student_review_items");
    if (error) throw error;
    return data ?? [];
  },

  async getTodayStudy() {
    const { data, error } = await supabase.rpc("get_student_today_study");
    if (error) throw error;
    return data ?? { minutes: 0 };
  },

  async getPerformance() {
    const { data, error } = await supabase.rpc("get_student_performance_summary");
    if (error) throw error;
    return data ?? null;
  },

  async getLearningSnapshot(topicId: string): Promise<LearningSnapshot | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("student_topic_progress")
      .select("topic_id,attempts_count,micro_questions_correct,micro_questions_attempted,best_score,last_learning_activity_at,next_micro_review_at,micro_mastery_level,micro_current_difficulty")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const attempts = Number(data.attempts_count ?? 0) + Number(data.micro_questions_attempted ?? 0);
    const correct = Number(data.micro_questions_correct ?? 0);
    return {
      topicId: data.topic_id,
      attempts,
      correct,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : Number(data.best_score ?? 0),
      bestScore: data.best_score === null ? null : Number(data.best_score),
      lastActivityAt: data.last_learning_activity_at,
      nextReviewAt: data.next_micro_review_at,
      mastery: data.micro_mastery_level,
      difficulty: data.micro_current_difficulty,
    };
  },

  async recordContext(topicId: string) {
    return this.getLearningSnapshot(topicId);
  },
};
