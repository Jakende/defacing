export function deploymentMetadata(siteUrl) {
  if (!siteUrl) return { head:'<meta name="robots" content="noindex, nofollow">', robots:'User-agent: *\nDisallow: /\n', sitemap:null };
  const site = new URL(siteUrl);
  if (!['http:','https:'].includes(site.protocol) || site.username || site.password || site.search || site.hash) throw new Error('SITE_URL must be an absolute HTTP(S) deployment URL without credentials, query or fragment.');
  if (!site.pathname.endsWith('/')) site.pathname += '/';
  const escape = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const url=escape(site.href), image=escape(new URL('og-image.png',site).href);
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebApplication',name:'Deface',url:site.href,applicationCategory:'MultimediaApplication',operatingSystem:'Web browser',description:'Private photo and video editing with local face masking and speech disguise.'}).replaceAll('<','\\u003c');
  return { head:`<link rel="canonical" href="${url}">\n<meta name="robots" content="index, follow">\n<meta property="og:url" content="${url}">\n<meta property="og:image" content="${image}">\n<meta name="twitter:image" content="${image}">\n<script type="application/ld+json">${schema}</script>`, robots:`User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml',site).href}\n`, sitemap:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>` };
}
