# Assistant Capability Roadmap

**Status:** Product direction (post Sprint 0)  
**Vision:** The Assistant is the application. Everything else is a capability.

Không mở rộng ATS theo màn hình. Mỗi EPIC thêm **năng lực** cho Recruiter Assistant.

| EPIC | Name | Capability |
|------|------|------------|
| **015** | [Intelligent Ingestion](../epics/EPIC-015-Intelligent-Ingestion.md) | Mọi nguồn → Knowledge Objects |
| **016** | [Knowledge Workspace](../epics/EPIC-016-Knowledge-Workspace.md) | Candidate / Job / JD là knowledge objects hạng nhất |
| **017** | [Tool Orchestration](../epics/EPIC-017-Tool-Orchestration.md) | Một intent → nhiều tool → một outcome |
| **018** | [AI Automation](../epics/EPIC-018-AI-Automation.md) | Workflow tự chạy theo rule / schedule |

### Shared UX law

D10 Language-agnostic · D11 Quiet AI · D12 Intelligent Ingestion — [UX-PRINCIPLES-TRIAD.md](./UX-PRINCIPLES-TRIAD.md)

### Sequencing

```
D10–D12 locked on main
        ↓
EPIC-015 Spec → Impl → Validation
        ↓
EPIC-016 Knowledge Workspace
        ↓
EPIC-017 Tool Orchestration
        ↓
EPIC-018 AI Automation
```
