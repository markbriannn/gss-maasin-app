# PROCESS 5: JOB APPROVAL & EXECUTION

## Level 1 DFD - Job Approval & Execution Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 5: JOB APPROVAL & EXECUTION                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
    │              │           │              │           │              │
    │    CLIENT    │           │    ADMIN     │           │   PROVIDER   │
    │              │           │              │           │              │
    └──────┬───────┘           └──────┬───────┘           └──────┬───────┘
           │                          │                          │
           │                          │                          │
           ▼                          │                          │
    ╭───────────────╮                 │                          │
    │      5.1      │                 │                          │
    │     WAIT      │                 │                          │
    │  FOR ADMIN    │                 │                          │
    ╰───────┬───────╯                 │                          │
            │                         │                          │
            │                         ▼                          │
            │                 ╭───────────────╮                  │
            │                 │      5.2      │                  │
            │                 │    APPROVE    │                  │
            │                 │  OR REJECT    │                  │
            │                 ╰───────┬───────╯                  │
            │                         │                          │
            │                         │ Approved                 │
            │                         ▼                          │
            │                 ╭───────────────╮                  │
            │                 │      5.3      │                  │
            │                 │    NOTIFY     │──────────────────▶
            │                 │   PROVIDER    │
            │                 ╰───────┬───────╯
            │                         │
            │                         │                          │
            │                         │                          ▼
            │                         │                  ╭───────────────╮
            │                         │                  │      5.4      │
            │                         │                  │    ACCEPT     │
            │                         │                  │  OR DECLINE   │
            │                         │                  ╰───────┬───────╯
            │                         │                          │
            │                         │                          │ Accepted
            │                         │                          ▼
            │                         │                  ╭───────────────╮
            │                         │                  │      5.5      │
            │◀─────────────────────────────────────────────────────────────
            │                         │                  │   EXECUTE     │
            │  Real-time Tracking     │                  │     JOB       │
            │                         │                  │               │
            │                         │                  │ • Traveling   │
            │                         │                  │ • Arrived     │
            │                         │                  │ • In Progress │
            │                         │                  │ • Complete    │
            │                         │                  ╰───────┬───────╯
            │                         │                          │
            ▼                         │                          │
    ╭───────────────╮                 │                          │
    │      5.6      │                 │                          │
    │   CONFIRM     │◀─────────────────────────────────────────────
    │  COMPLETION   │
    ╰───────────────╯
            │
            ▼
    ┌───────────────┐
    │               │
    │   PROCESS 6   │
    │   FEEDBACK    │
    │               │
    └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **5.1** | Wait for Admin | Client waits on booking status screen |
| **5.2** | Approve or Reject | Admin approves or rejects booking (auto-refund if rejected) |
| **5.3** | Notify Provider | System sends push notification to provider |
| **5.4** | Accept or Decline | Provider accepts or declines the job |
| **5.5** | Execute Job | Provider travels, arrives, works, completes (real-time tracking) |
| **5.6** | Confirm Completion | Client confirms job is done |

---

## Job Status Flow

```
pending → paid → adminApproved → accepted → traveling → arrived → in_progress → completed
                      │                          │
                      └──→ rejected              └──→ declined
                           (+ refund)
```

---

## Legend

```
╭───────────────╮
│     5.X       │     Process
╰───────────────╯

─────────────────▶    Data Flow
```

