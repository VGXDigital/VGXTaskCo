# n8n Reminder Flow Setup

This document describes how to set up the n8n automation that sends daily task reminders using the vgx-taskco service endpoints.

## Prerequisites

- A service-scoped API token (created via `POST /api-tokens` with `scope: "service"`)
- n8n instance with HTTP Request and Email Send nodes available
- SMTP credentials configured in n8n

## Flow Overview

```
Cron (08:00 daily) → HTTP GET /internal/reminders/due-today → Group by owner → Send email per owner
```

## Step-by-Step

### 1. Cron Trigger Node

- Type: Schedule Trigger
- Cron expression: `0 8 * * *` (08:00 UTC daily)

### 2. HTTP Request Node — Fetch Due Today

- Method: GET
- URL: `https://your-vgxtaskco-host/internal/reminders/due-today`
- Authentication: Header Auth
  - Name: `Authorization`
  - Value: `Bearer vgxt_<your-service-token>`
- Response format: JSON

### 3. Code Node — Group tasks by owner email

```javascript
const tasks = $input.all()[0].json.data;

const grouped = {};
for (const item of tasks) {
  const email = item.owner.email;
  if (!grouped[email]) {
    grouped[email] = { owner: item.owner, tasks: [] };
  }
  grouped[email].tasks.push(item.task);
}

return Object.values(grouped).map(group => ({ json: group }));
```

### 4. Send Email Node (one per owner, triggered by the split output)

- To: `{{ $json.owner.email }}`
- Subject: `vgx-taskco — You have {{ $json.tasks.length }} task(s) due today`
- Body (HTML):

```html
<p>Hi {{ $json.owner.name }},</p>
<p>The following tasks are due today:</p>
<ul>
  {{#each tasks}}
  <li><strong>{{ this.title }}</strong> — {{ this.priority }} priority</li>
  {{/each}}
</ul>
<p>Log in to vgx-taskco to review and update them.</p>
```

## Notes

- The `/internal/reminders/due-today` endpoint requires a service-scoped API token. A user JWT or user-scoped token will return `403 Service token required`.
- An identical flow can be set up for `/internal/reminders/overdue` — use a different subject line and cron time (e.g. Mondays at 09:00).
- Keep the service token in n8n credentials, never in the workflow JSON directly.
