function getBasePath() {
  if (window.location.hostname.endsWith('github.io')) {
    const [firstSegment = ''] = window.location.pathname.split('/').filter(Boolean);

    return firstSegment ? `/${firstSegment}/` : '/';
  }

  return '/';
}

function rewriteInternalPathsForSubdirectory() {
  if (!window.location.pathname.includes('/tjenester/') && !window.location.pathname.includes('/kontakt/')) {
    return;
  }

  const selectors = [
    ['href', 'a[href], link[href]'],
    ['src', '[src]'],
  ];

  selectors.forEach(([attribute, selector]) => {
    document.querySelectorAll(selector).forEach((element) => {
      const value = element.getAttribute(attribute);

      if (!value) {
        return;
      }

      if (
        value.startsWith('../') ||
        value.startsWith('./') ||
        value.startsWith('#') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('mailto:') ||
        value.startsWith('tel:') ||
        value.startsWith('data:')
      ) {
        return;
      }

      element.setAttribute(attribute, `../${value}`);
    });
  });
}

async function loadPartial(targetId, partialPath) {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const response = await fetch(partialPath);

  if (!response.ok) {
    throw new Error(`Kunne ikke laste ${partialPath}`);
  }

  target.innerHTML = await response.text();
}

async function loadSharedLayout() {
  const basePath = getBasePath();

  await Promise.all([
    loadPartial('site-header', `${basePath}partials/header.html`),
    loadPartial('site-footer', `${basePath}partials/footer.html`),
  ]);

  rewriteInternalPathsForSubdirectory();
}

async function fetchServices() {
  const basePath = getBasePath();
  let response;

  try {
    response = await fetch(`${basePath}data/services.json?v=${Date.now()}`, { cache: 'no-store' });
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


function updateCanonicalAndOgUrl(includeSearch = false) {
  const canonicalLink = document.getElementById('canonical-link');
  const ogUrl = document.getElementById('og-url');
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
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
  const basePath = getBasePath();
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
      serviceBackLink.setAttribute('href', `${basePath}tjenester/index.html`);
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
    serviceBackLink.setAttribute('href', `${basePath}tjenester/index.html`);
  }
}

function createServiceCard(service) {
  const basePath = getBasePath();

  return `
    <article class="service-card">
      <h3>${service.title}</h3>
      <p>${service.shortDescription}</p>
      <a class="button button-link" href="${basePath}tjenester/service.html?slug=${encodeURIComponent(service.slug)}">Les mer</a>
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

document.addEventListener('DOMContentLoaded', init);
