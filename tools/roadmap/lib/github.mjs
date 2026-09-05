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
