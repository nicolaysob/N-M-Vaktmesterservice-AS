function getBasePath() {
  return window.location.pathname.includes('/tjenester/') ? '..' : '.';
}

function rewriteInternalPathsForSubdirectory() {
  if (!window.location.pathname.includes('/tjenester/')) {
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
    loadPartial('site-header', `${basePath}/partials/header.html`),
    loadPartial('site-footer', `${basePath}/partials/footer.html`),
  ]);

  rewriteInternalPathsForSubdirectory();
}

async function fetchServices() {
  const basePath = getBasePath();
  const response = await fetch(`${basePath}/data/services.json`);

  if (!response.ok) {
    throw new Error('Kunne ikke laste tjenestedata');
  }

  return response.json();
}

function getServiceSlug() {
  const querySlug = new URLSearchParams(window.location.search).get('slug');
  const fallbackSlug = document.body.dataset.slug || '';

  return querySlug || fallbackSlug;
}

async function loadServiceContent() {
  const serviceTitle = document.getElementById('service-title');
  const serviceDescription = document.getElementById('service-description');
  const serviceHero = document.getElementById('service-hero');
  const serviceBackLink = document.getElementById('service-back-link');

  if (!serviceTitle || !serviceDescription || !serviceHero) {
    return;
  }

  const services = await fetchServices();
  const slug = getServiceSlug();
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    document.title = 'Tjeneste ikke funnet | N&M Vaktmesterservice AS';
    serviceTitle.textContent = 'Tjeneste ikke funnet';
    serviceDescription.textContent =
      'Beklager, vi fant ikke tjenesten du leter etter. Se oversikten over alle tjenester.';
    serviceHero.style.background = 'linear-gradient(180deg, #eef4f8 0%, #f6f8fb 100%)';

    if (serviceBackLink) {
      serviceBackLink.textContent = 'Tilbake til tjenester';
      serviceBackLink.setAttribute('href', './index.html');
    }

    return;
  }

  document.title = `${service.title} | N&M Vaktmesterservice AS`;
  serviceTitle.textContent = service.title;
  serviceDescription.textContent = service.longDescription;
  serviceHero.style.backgroundColor = service.heroColor;

  if (serviceBackLink) {
    serviceBackLink.textContent = 'Tilbake til tjenester';
    serviceBackLink.setAttribute('href', './index.html');
  }
}

function createServiceCard(service) {
  return `
    <article class="service-card">
      <h3>${service.title}</h3>
      <p>${service.shortDescription}</p>
      <a class="button button-link" href="./service.html?slug=${encodeURIComponent(service.slug)}">Les mer</a>
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
    await loadSharedLayout();
    await Promise.all([loadServiceContent(), loadServicesList()]);
    initContactFormSource();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
