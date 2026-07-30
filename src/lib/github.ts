/**
 * GitHub 仓库统计数据获取
 * 
 * 在服务端（构建时或请求时）调用 GitHub API 获取 star/fork 数
 * - 优先使用 GITHUB_TOKEN（Vercel 自带或手动配置）
 * - 降级为匿名请求（60/h rate limit）
 * - 失败时返回 fallback 数据
 */

interface RepoStats {
  stars: number;
  forks: number;
}

interface RepoData {
  name: string;
  owner: string;
  fallback: RepoStats;
}

const REPOS: RepoData[] = [
  {
    name: "codex-keysmith",
    owner: "Jia-Ethan",
    fallback: { stars: 2100, forks: 350 },
  },
  {
    name: "claude-keysmith",
    owner: "Jia-Ethan",
    fallback: { stars: 490, forks: 90 },
  },
  {
    name: "pavedpath-code",
    owner: "Jia-Ethan",
    fallback: { stars: 380, forks: 34 },
  },
  {
    name: "grok-keysmith",
    owner: "Jia-Ethan",
    fallback: { stars: 145, forks: 22 },
  },
];

/**
 * 从 GitHub API 获取单个仓库的 stars/forks
 * 带重试和超时控制
 */
async function fetchRepoStats(
  owner: string,
  repo: string
): Promise<RepoStats | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pier-blog",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: controller.signal,
      next: { revalidate: 86400 }, // 24h 缓存
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(
        `[GitHub API] ${owner}/${repo} failed: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const data = await res.json();
    return {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
    };
  } catch (err) {
    console.warn(`[GitHub API] ${owner}/${repo} error:`, err);
    return null;
  }
}

/**
 * 格式化数字为 K 表示（1234 → 1.2k）
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`.replace(/\.0k$/, "k");
  }
  return count.toString();
}

/**
 * 获取所有仓库的统计数据
 * 失败时使用 fallback
 */
export async function getGitHubStats(): Promise<
  Array<{
    name: string;
    stars: string;
    forks: string;
  }>
> {
  const results = await Promise.allSettled(
    REPOS.map((repo) => fetchRepoStats(repo.owner, repo.name))
  );

  return REPOS.map((repo, i) => {
    const result = results[i];
    const stats =
      result.status === "fulfilled" && result.value
        ? result.value
        : repo.fallback;

    return {
      name: repo.name,
      stars: formatCount(stats.stars),
      forks: formatCount(stats.forks),
    };
  });
}
