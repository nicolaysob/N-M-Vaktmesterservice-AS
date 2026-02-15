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

function getServiceSlugFromPath() {
  const pathName = window.location.pathname;
  const fileName = pathName.split('/').pop() || '';
  return fileName.replace('.html', '');
}

async function loadServiceContent() {
  const serviceTitle = document.getElementById('service-title');
  const serviceDescription = document.getElementById('service-description');
  const serviceHero = document.getElementById('service-hero');

  if (!serviceTitle || !serviceDescription || !serviceHero) {
    return;
  }

  const basePath = getBasePath();
  const response = await fetch(`${basePath}/data/services.json`);

  if (!response.ok) {
    throw new Error('Kunne ikke laste tjenestedata');
  }

  const services = await response.json();
  const slug = getServiceSlugFromPath();
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return;
  }

  serviceTitle.textContent = service.title;
  serviceDescription.textContent = service.longDescription;
  serviceHero.style.backgroundColor = service.heroColor;
}

async function init() {
  try {
    await loadSharedLayout();
    await loadServiceContent();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
