export function formatBundleHttpError(status: number): string {
  switch (status) {
    case 400:
      return "请求无效，请刷新页面后重试";
    case 403:
      return "无权访问该资源";
    case 404:
      return "资源不存在，可能已过期或索引未更新";
    case 408:
    case 504:
      return "下载超时，请检查网络后重试";
    case 502:
    case 503:
      return "远程服务暂时不可用，请稍后重试";
    default:
      if (status >= 500) {
        return `服务器错误（HTTP ${status}），请稍后重试`;
      }
      return `下载失败（HTTP ${status}）`;
  }
}

export async function fetchBundleBuffer(hash: string): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(bundleProxyUrl(hash), { cache: "force-cache" });
  } catch {
    throw new Error("网络连接失败，请检查网络后重试");
  }

  if (!res.ok) {
    throw new Error(formatBundleHttpError(res.status));
  }

  try {
    return await res.arrayBuffer();
  } catch {
    throw new Error("资源数据读取失败，请重试");
  }
}

/** 空字符串表示禁用远程加载；未设置时开发环境默认 /proxy */
export function getBundleProxyPrefix(): string | null {
  const value = import.meta.env.VITE_BUNDLE_PROXY_PREFIX;
  if (value === "") return null;
  return value ?? "/proxy";
}

export function isRemoteBundleEnabled(): boolean {
  return getBundleProxyPrefix() !== null;
}

export function bundleProxyUrl(hash: string): string {
  const prefix = getBundleProxyPrefix();
  if (!prefix) {
    throw new Error("远程 bundle 代理未配置");
  }
  const base = prefix.replace(/\/$/, "");
  return `${base}/${hash}`;
}
