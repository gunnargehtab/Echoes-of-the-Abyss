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

/** `Map<number, {state, title, url, closedAt}>` for the issues asked about. */
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
      closedAt: issue.closed_at ?? null,
    });
  }
  return states;
}

/** Walk a paginated list endpoint. Capped, so a runaway repo cannot spend the rate limit. */
async function listAll(url, token, { maxPages = 30 } = {}) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await getJson(
      `${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
      token
    );
    if (!Array.isArray(batch)) return items.length === 0 ? null : items;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

/**
 * The repository in numbers, from repository-scoped endpoints only: the
 * search API is the cheaper way to count, but a token scoped to one
 * repository (a GitHub App installation, an Actions token behind a proxy)
 * may not be allowed to search at all, and a count that works in one place
 * and not another is worse than a count that pages. Null for anything that
 * could not be read, and the renderer leaves that tile out rather than
 * showing a zero — zero is a claim.
 */
export async function fetchRepoStats(repo, token) {
  const stats = { issuesClosed: null, issuesOpen: null, prsMerged: null };
  if (!token) return stats;
  // The issues endpoint lists pull requests too; anything with a
  // `pull_request` key is one and is not an issue.
  const closed = await listAll(`${API}/repos/${repo}/issues?state=closed`, token);
  if (closed !== null) stats.issuesClosed = closed.filter((i) => !i.pull_request).length;
  const open = await listAll(`${API}/repos/${repo}/issues?state=open`, token);
  if (open !== null) stats.issuesOpen = open.filter((i) => !i.pull_request).length;
  const pulls = await listAll(`${API}/repos/${repo}/pulls?state=closed`, token);
  if (pulls !== null) stats.prsMerged = pulls.filter((p) => p.merged_at !== null).length;
  return stats;
}
