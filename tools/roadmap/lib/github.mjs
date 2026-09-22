/**
 * Everything the site knows about *state* comes from here, and none of it is
 * stored anywhere: whether an issue is open is not something a checked-in
 * file can know, and a hand-maintained checkbox is wrong the moment somebody
 * closes an issue from their phone.
 *
 * Without a token every call returns "nothing known" rather than throwing, so
 * the generator stays runnable by anyone and a token outage produces an
 * honest page instead of a broken build.
 */

const API = 'https://api.github.com';

function headers(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'user-agent': 'echoes-roadmap-build',
  };
}

async function getJson(url, token) {
  const response = await fetch(url, { headers: headers(token) }).catch(() => null);
  if (response === null || !response.ok) return null;
  return response.json().catch(() => null);
}

/** `Map<number, {state, title, url, createdAt, closedAt}>` for the issues asked about. */
export async function fetchIssueStates(repo, numbers, token) {
  const states = new Map();
  if (!token) return states;
  for (const number of numbers) {
    const issue = await getJson(`${API}/repos/${repo}/issues/${number}`, token);
    if (issue === null) continue;
    states.set(number, {
      state: issue.state,
      title: issue.title,
      url: issue.html_url,
      // Both timestamps, because lib/dates.mjs spans each phase from the day
      // its first issue was filed to the day its last one closed.
      createdAt: issue.created_at ?? null,
      closedAt: issue.closed_at ?? null,
    });
  }
  return states;
}

/**
 * Every issue in the repository, open and closed —
 * `[{number, title, url, state, stateReason, labels, parent}]`, pull requests
 * dropped (the issues endpoint lists them too). `parent` is the number of the
 * issue this one is a sub-issue of, or null: an epic's row stands for its
 * sub-issues, so the drift check walks up to it. One page of a hundred per
 * call, so the whole tracker is a handful of requests rather than one per
 * number. Empty without a token, like everything else here.
 */
export async function fetchAllIssues(repo, token) {
  const issues = [];
  if (!token) return issues;
  for (let page = 1; page < 50; page++) {
    const batch = await getJson(
      `${API}/repos/${repo}/issues?state=all&per_page=100&page=${page}`,
      token
    );
    if (!Array.isArray(batch)) break;
    for (const issue of batch) {
      if (issue.pull_request) continue;
      const parent = /\/issues\/(\d+)$/.exec(issue.parent_issue_url ?? '');
      issues.push({
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state,
        stateReason: issue.state_reason ?? null,
        labels: (issue.labels ?? []).map((label) =>
          typeof label === 'string' ? label : label.name
        ),
        parent: parent === null ? null : Number(parent[1]),
      });
    }
    if (batch.length < 100) break;
  }
  return issues;
}
