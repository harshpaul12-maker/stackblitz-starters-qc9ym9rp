// app/api/tickets/route.ts
// Place this file at: app/api/tickets/route.ts in your Next.js project

const JIRA_BASE = "https://adroit-vantage.atlassian.net";
const JIRA_EMAIL = "harsh.paul@keenaiglobal.com";
const JIRA_PROJECT_KEY = "VCG";
const JIRA_ISSUE_TYPE = "Task";

function getAuthHeader() {
  const token = process.env.JIRA_TOKEN;
  if (!token) throw new Error("JIRA_TOKEN environment variable is not set");
  const encoded = Buffer.from(`${JIRA_EMAIL}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

// ─── GET — fetch all tickets from Jira ───────────────────────
export async function GET() {
  try {
    const jql = `project = ${JIRA_PROJECT_KEY} AND issuetype = ${JIRA_ISSUE_TYPE} ORDER BY created DESC`;
    const url = `${JIRA_BASE}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,description,status,created,customfield_10000`;

    const res = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Parse Jira issues into our ticket format
    const tickets = data.issues.map((issue: any) => {
      // Description is stored as Atlassian Document Format (ADF)
      // We store our fields as JSON in the description
      let parsed: any = {};
      try {
        const descText = issue.fields.description?.content?.[0]?.content?.[0]?.text || "{}";
        parsed = JSON.parse(descText);
      } catch {}

      return {
        id: issue.key,                          // e.g. VCG-1
        jiraId: issue.id,
        name: parsed.name || issue.fields.summary,
        emailCreation: parsed.emailCreation || "",
        emailSharing: parsed.emailSharing || "",
        type: parsed.type || "Creation of Creds",
        passwordRequested: parsed.passwordRequested || null,
        status: issue.fields.status.name === "Done" ? "Resolved" : "Open",
        jiraStatus: issue.fields.status.name,
        createdAt: new Date(issue.fields.created).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      };
    });

    return Response.json({ tickets });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ─── POST — create a new Jira ticket ─────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, emailCreation, emailSharing, type, passwordRequested } = body;

    // Store all our custom fields as JSON in the description
    const descriptionData = JSON.stringify({
      name,
      emailCreation,
      emailSharing,
      type,
      passwordRequested: passwordRequested || null,
    });

    const summary = `[${type}] ${name} — ${emailCreation}`;

    const payload = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        issuetype: { name: JIRA_ISSUE_TYPE },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: descriptionData,
                },
              ],
            },
          ],
        },
      },
    };

    const res = await fetch(`${JIRA_BASE}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ id: data.key, jiraId: data.id });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ─── PATCH — update ticket status (Resolve / Reopen) ─────────
export async function PATCH(req: Request) {
  try {
    const { jiraId, action } = await req.json();

    // Get available transitions for this issue
    const transRes = await fetch(`${JIRA_BASE}/rest/api/3/issue/${jiraId}/transitions`, {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
    });

    const transData = await transRes.json();
    const transitions: any[] = transData.transitions || [];

    // Match "Done" for resolve, "To Do" or "In Progress" for reopen
    const targetName = action === "resolve" ? "done" : "to do";
    const transition = transitions.find((t: any) =>
      t.name.toLowerCase().includes(targetName) ||
      t.to?.name?.toLowerCase().includes(targetName)
    ) || transitions[action === "resolve" ? transitions.length - 1 : 0];

    if (!transition) {
      return Response.json({ error: "Transition not found" }, { status: 400 });
    }

    const res = await fetch(`${JIRA_BASE}/rest/api/3/issue/${jiraId}/transitions`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ─── DELETE — delete a Jira ticket ───────────────────────────
export async function DELETE(req: Request) {
  try {
    const { jiraId } = await req.json();

    const res = await fetch(`${JIRA_BASE}/rest/api/3/issue/${jiraId}`, {
      method: "DELETE",
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}