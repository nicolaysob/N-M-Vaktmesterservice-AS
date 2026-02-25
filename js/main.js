const REPO_PATH = '/N-M-Vaktmesterservice-AS';

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return '';
  }

  return basePath.replace(/\/+$/, '');
}

function getBasePath() {
  if (typeof window.BASE_PATH === 'string') {
    return normalizeBasePath(window.BASE_PATH);
  }

  if (window.location.hostname.endsWith('github.io')) {
    const [firstSegment = ''] = window.location.pathname.split('/').filter(Boolean);

    return normalizeBasePath(firstSegment ? `/${firstSegment}` : REPO_PATH);
  }

  return '';
}

function buildBaseUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path.replace(/^\.?\/+/, '')}`;

  return `${getBasePath()}${normalizedPath}`;
}

function withBasePath(path) {
  if (!path || /^(https?:|mailto:|tel:|data:|#|javascript:)/.test(path)) {
    return path;
  }

  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path.replace(/^\.?\/+/, '')}`;

  if (!basePath) {
    return normalizedPath;
  }

  if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath;
  }

  if (normalizedPath === REPO_PATH || normalizedPath.startsWith(`${REPO_PATH}/`)) {
    return `${basePath}${normalizedPath.slice(REPO_PATH.length)}`;
  }

  return `${basePath}${normalizedPath}`;
}

function rewriteInternalDomPaths() {
  const selectors = [
    ['href', '[href]'],
    ['src', '[src]'],
    ['action', 'form[action]'],
  ];

  selectors.forEach(([attribute, selector]) => {
    document.querySelectorAll(selector).forEach((element) => {
      const value = element.getAttribute(attribute);

      if (!value) {
        return;
      }

      element.setAttribute(attribute, withBasePath(value));
    });
  });
}


async function loadPartial(containerId, file) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Missing container: #${containerId}`);
    return;
  }

  const BASE_PATH = getBasePath();
  const url = `${BASE_PATH}/partials/${file}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Failed to fetch ${url}:`, res.status);
      return;
    }

    const html = await res.text();
    container.innerHTML = html;
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
  }
}

async function loadSharedLayout() {
  await Promise.all([
    loadPartial('site-header', 'header.html'),
    loadPartial('site-footer', 'footer.html'),
  ]);

  rewriteInternalDomPaths();
}

async function fetchServices() {
  let response;

  try {
    response = await fetch(buildBaseUrl(`/data/services.json?v=${Date.now()}`), { cache: 'no-store' });
  } catch (error) {
    console.error('Kunne ikke hente data/services.json.', error);
    throw error;
  }

  if (!response.ok) {
    const fetchError = new Error(`Kunne ikke laste tjenestedata (status ${response.status})`);
    console.error('Kunne ikke laste data/services.json.', fetchError);
    throw fetchError;
  }

  return response.json();
}

function getServiceSlug() {
  return new URLSearchParams(window.location.search).get('slug') || '';
}

function setMetaTag(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute('content', value);
  }
}


function normalizeCanonicalPath(pathname) {
  if (pathname === '/index.html') {
    return '/';
  }

  if (pathname.endsWith('/index.html')) {
    return `${pathname.slice(0, -'index.html'.length)}`;
  }

  return pathname;
}

function updateCanonicalAndOgUrl(includeSearch = false) {
  const canonicalLink = document.getElementById('canonical-link');
  const ogUrl = document.getElementById('og-url');
  const normalizedPath = normalizeCanonicalPath(window.location.pathname);
  const baseUrl = `${window.location.origin}${normalizedPath}`;
  const finalUrl = includeSearch ? `${baseUrl}${window.location.search}` : baseUrl;

  if (canonicalLink) {
    canonicalLink.setAttribute('href', finalUrl);
  }

  if (ogUrl) {
    ogUrl.setAttribute('content', finalUrl);
  }
}

function updateServiceSeo({ title, description }) {
  setMetaTag('meta[name="description"]', description);
  setMetaTag('meta[property="og:title"]', title);
  setMetaTag('meta[property="og:description"]', description);
  setMetaTag('meta[name="twitter:title"]', title);
  setMetaTag('meta[name="twitter:description"]', description);
}

async function loadServiceContent() {
  const serviceTitle = document.getElementById('service-title');
  const serviceIntro = document.getElementById('service-intro');
  const serviceDescription = document.getElementById('service-description');
  const serviceBullets = document.getElementById('service-bullets');
  const serviceBackLink = document.getElementById('service-back-link');

  if (!serviceTitle || !serviceIntro || !serviceDescription || !serviceBullets) {
    console.error(
      'Mangler påkrevde DOM-elementer på tjenestesiden: #service-title, #service-intro, #service-description eller #service-bullets.',
    );
    return;
  }

  const services = await fetchServices();
  const slug = getServiceSlug();
  const hasSlugInUrl = new URLSearchParams(window.location.search).has('slug');
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    const notFoundTitle = 'Tjeneste ikke funnet | N&M Vaktmesterservice AS';
    const notFoundDescription = 'Beklager, vi fant ikke tjenesten du leter etter.';

    console.error(`Fant ingen tjeneste med slug "${slug}" i services.json.`);
    document.title = notFoundTitle;
    serviceTitle.textContent = 'Tjeneste ikke funnet';
    serviceIntro.textContent = '';
    serviceDescription.textContent = notFoundDescription;
    serviceBullets.innerHTML = '';
    serviceBullets.hidden = true;
    updateServiceSeo({
      title: notFoundTitle,
      description: notFoundDescription,
    });
    updateCanonicalAndOgUrl(hasSlugInUrl);

    if (serviceBackLink) {
      serviceBackLink.textContent = 'Tilbake til tjenester';
      serviceBackLink.setAttribute('href', withBasePath('/tjenester/'));
    }

    return;
  }

  const seoTitle = `${service.title} | N&M Vaktmesterservice AS`;

  document.title = seoTitle;
  serviceTitle.textContent = service.title;
  serviceIntro.textContent = service.shortDescription || '';
  serviceDescription.textContent = service.longDescription || '';

  const bullets = Array.isArray(service.bullets) ? service.bullets.filter(Boolean) : [];

  serviceBullets.innerHTML = bullets.map((bullet) => `<li>${bullet}</li>`).join('');
  serviceBullets.hidden = bullets.length === 0;

  updateServiceSeo({
    title: seoTitle,
    description: service.longDescription,
  });
  updateCanonicalAndOgUrl(hasSlugInUrl);

  if (serviceBackLink) {
    serviceBackLink.textContent = 'Tilbake til tjenester';
    serviceBackLink.setAttribute('href', withBasePath('/tjenester/'));
  }
}

function createServiceCard(service) {
  return `
    <article class="service-card">
      <h3>${service.title}</h3>
      <p>${service.shortDescription}</p>
      <a class="button button-link" href="${withBasePath(`/tjenester/service/?slug=${encodeURIComponent(service.slug)}`)}">Les mer</a>
    </article>
  `;
}

async function loadServicesList() {
  const servicesList = document.getElementById('services-list');

  if (!servicesList) {
    return;
  }

  const services = await fetchServices();
  servicesList.innerHTML = services.map(createServiceCard).join('');
}


function initContactFormSource() {
  const sourceInput = document.getElementById('source');
  const customerTypeGroup = document.getElementById('customerTypeGroup');
  const customerTypeSelect = document.getElementById('customerType');

  if (!sourceInput || !customerTypeGroup || !customerTypeSelect) {
    return;
  }

  const source = new URLSearchParams(window.location.search).get('source') || '';
  sourceInput.value = source;

  const isBusinessFlow = source === 'bedrift';
  customerTypeGroup.classList.toggle('hidden', !isBusinessFlow);
  customerTypeSelect.required = isBusinessFlow;

  if (!isBusinessFlow) {
    customerTypeSelect.value = '';
  }
}

async function init() {
  try {
    updateCanonicalAndOgUrl();
    await loadSharedLayout();
    await Promise.all([loadServiceContent(), loadServicesList()]);
    initContactFormSource();
  } catch (error) {
    console.error(error);
  }
}

function safeInit() {
  try {
    init();
  } catch (e) {
    console.error('Init failed:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}
