/** GitHub 图床仓库中 PetAnimPackage 目录的前缀 */
export const GITHUB_CDN_REPO = "SeerAPI/seer-unity-assets-pet_anim_part";
export const GITHUB_CDN_BRANCH = "main";
export const GITHUB_CDN_PACKAGE_PATH = "newseer/assetbundles/PetAnimPackage";

/** jsDelivr 前缀（浏览器可直接跨域 fetch） */
export const DEFAULT_LARGE_BUNDLE_CDN_PREFIX = `https://cdn.jsdelivr.net/gh/${GITHUB_CDN_REPO}@${GITHUB_CDN_BRANCH}/${GITHUB_CDN_PACKAGE_PATH}`;

const TREE_API = `https://api.github.com/repos/${GITHUB_CDN_REPO}/git/trees/${GITHUB_CDN_BRANCH}?recursive=1`;

/**
 * 将索引中的 bundle 名称映射为图床文件名。
 * 共享包在仓库中带 .bundle 后缀，精灵条目不带。
 * @param {string} bundleName
 */
export function githubCdnFileName(bundleName) {
  if (bundleName.startsWith("petanimpackage_share_")) {
    return `${bundleName}.bundle`;
  }
  return bundleName;
}

/**
 * @param {string} githubFileName 图床中的文件名（不含路径）
 * @returns {string} 索引中的 bundle 名称
 */
export function indexNameFromGithubFile(githubFileName) {
  if (githubFileName.endsWith(".bundle")) {
    return githubFileName.slice(0, -".bundle".length);
  }
  return githubFileName;
}

/**
 * 拉取 GitHub 图床已有文件列表，返回索引 bundle 名称集合。
 * @returns {Promise<Set<string>>}
 */
export async function fetchGithubMirroredNames() {
  const res = await fetch(TREE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "seer-pet-viewer-build",
    },
  });

  if (!res.ok) {
    throw new Error(`无法拉取 GitHub 图床清单: HTTP ${res.status}`);
  }

  const data = await res.json();
  const prefix = `${GITHUB_CDN_PACKAGE_PATH}/`;
  const names = new Set();

  for (const item of data.tree ?? []) {
    if (item.type !== "blob" || !item.path.startsWith(prefix)) {
      continue;
    }
    const fileName = item.path.slice(prefix.length);
    if (!fileName || fileName.includes("/")) {
      continue;
    }
    names.add(indexNameFromGithubFile(fileName));
  }

  return names;
}
