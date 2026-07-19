# EPIC-010 Implementation Notes — Fan-out strategy

| Field   | Value                                      |
| ------- | ------------------------------------------ |
| Spec    | PR #37 (+ AC-3b)                           |
| Baseline| `main @ d1acf46`                           |

## Single fan-out strategy (no duplicate same-type emits)

| Source outcome                         | Emit site                         | Notification type           | Recipient        |
| -------------------------------------- | --------------------------------- | --------------------------- | ---------------- |
| Assign changed                         | `RelationshipService.assign`      | `assignment`                | `assigneeId`     |
| Stage actually changed                 | `RelationshipService.moveStage`   | `workflow.stage_changed`    | `assigneeId`     |
| Automation success && !noop            | `AutomationService.ok`            | `automation.completed`      | executing actor  |
| Collaboration note with `@actorId`     | `NotificationService.createNote`  | `mention`                   | mentioned actors |

Automation stage-move / assign therefore yields **two different types** (domain + automation.completed), never two `assignment` or two `workflow.stage_changed` for one outcome.

Stage/assign notifications require a known `assigneeId` in Actor Registry; otherwise no domain notification is created (no invented recipients).

## Authorization

| Route                                      | Permission            | Viewer |
| ------------------------------------------ | --------------------- | ------ |
| `GET /notifications`                       | `notification.read`   | ✅     |
| `POST /notifications/:id/read`             | `notification.read`   | ✅ (inbox hygiene) |
| `POST /notifications/read-all`             | `notification.read`   | ✅     |
| `POST /collaboration/notes`                | `notification.write`  | ❌     |

## Immutability (AC-3b)

`markRead` / `markAllRead` update only `readAt`. Repository APIs do not expose content mutation.
