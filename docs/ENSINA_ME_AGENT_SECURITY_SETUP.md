# Ensina-me Agent — Security Setup

The runtime requires a real authenticated Supabase user.

## HUMAN_OWNER binding

The runtime only accepts HUMAN_OWNER when the authenticated JWT subject equals the server-side secret:

ENSINA_AGENT_OWNER_USER_ID

Do not put this value in the repository or client code.

The value must be the UUID of the actual owner account.

If the secret is absent, HUMAN_OWNER requests are rejected by design.

## ORCHESTRATOR binding

ORCHESTRATOR requires:

ENSINA_AGENT_ORCHESTRATOR_KEY

It is checked only server-side through the x-ensina-orchestrator-key header.

## Approval gate

Every tool request receives a deterministic SHA-256 scope hash over:
- run
- task
- tool
- purpose
- arguments
- risk

High-risk execution requires an exact ORCHESTRATOR approval for that scope.

Critical execution requires exact approvals from both HUMAN_OWNER and ORCHESTRATOR.

A different scope hash does not authorize the action.

## Conflict policy

If HUMAN_OWNER and ORCHESTRATOR disagree, the agent must STOP_AND_ESCALATE.

## Important

External tool execution is still orchestrator-mediated. The runtime authorizes a tool request; it does not receive unrestricted credentials for every external system.
