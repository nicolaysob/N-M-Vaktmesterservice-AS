function getBasePath() {
  return window.location.pathname.includes('/tjenester/') ? '..' : '.';
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

  if (querySlug) {
    return querySlug;
  }

  return document.body.dataset.slug || '';
}

function renderServiceNotFound() {
  const serviceTitle = document.getElementById('service-title');
  const serviceDescription = document.getElementById('service-description');
  const serviceHero = document.getElementById('service-hero');

  if (!serviceTitle || !serviceDescription || !serviceHero) {
    return;
  }

  serviceTitle.textContent = 'Tjeneste ikke funnet';
  serviceDescription.textContent =
    'Vi fant ikke tjenesten du lette etter. Gå tilbake for å se oversikten over tilgjengelige tjenester.';
  serviceHero.style.backgroundColor = '#4a4a4a';
  document.title = 'Ikke funnet | N-M Vaktmesterservice AS';
}

async function loadServiceContent() {
  const serviceTitle = document.getElementById('service-title');
  const serviceDescription = document.getElementById('service-description');
  const serviceHero = document.getElementById('service-hero');

  if (!serviceTitle || !serviceDescription || !serviceHero) {
    return;
  }

  const services = await fetchServices();
  const slug = getServiceSlug();

  if (!slug) {
    renderServiceNotFound();
    return;
  }

  const service = services.find((item) => item.slug === slug);

  if (!service) {
    renderServiceNotFound();
    return;
  }

  serviceTitle.textContent = service.title;
  serviceDescription.textContent = service.longDescription;
  serviceHero.style.backgroundColor = service.heroColor;
  document.title = `${service.title} | N-M Vaktmesterservice AS`;
}

async function loadServicesOverview() {
  const servicesList = document.getElementById('services-list');

  if (!servicesList) {
    return;
  }

  const services = await fetchServices();

  servicesList.innerHTML = services
    .map(
      (service) => `
      <article class="service-card">
        <h2>${service.title}</h2>
        <p>${service.shortDescription}</p>
        <a class="button button-link" href="/tjenester/service.html?slug=${service.slug}">Les mer</a>
      </article>
    `,
    )
    .join('');
}

async function init() {
  try {
    await loadSharedLayout();
    await Promise.all([loadServiceContent(), loadServicesOverview()]);
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
