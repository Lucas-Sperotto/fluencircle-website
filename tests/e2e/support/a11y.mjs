/**
 * @file Checagens BÁSICAS de acessibilidade executadas no DOM real da página.
 *
 * Cobrem erros objetivos e frequentes (WCAG 2.2: 1.1.1, 1.3.1, 2.1.1, 2.4.2,
 * 3.1.1, 4.1.2): idioma e título da página, nome acessível de campos, botões e
 * links visíveis, imagens com alt, tabindex positivo, ids duplicados e
 * referências ARIA quebradas. NÃO substituem auditoria completa (axe-core,
 * contraste, leitor de tela real, teste com pessoas usuárias).
 */

/** @returns {Promise<string[]>} lista de violações (vazia = aprovado) */
export async function auditAccessibility(page) {
  return page.evaluate(() => {
    const problems = [];
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const describe = (element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`;
    const labelledBy = (element) => (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent.trim() || '').join(' ').trim();
    const accessibleName = (element) => element.getAttribute('aria-label')?.trim()
      || labelledBy(element)
      || (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent.trim())
      || element.closest('label')?.textContent.trim()
      || element.getAttribute('title')?.trim()
      || '';

    if (!document.documentElement.lang) problems.push('<html> sem atributo lang');
    if (!document.title.trim()) problems.push('página sem <title>');

    for (const field of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
      if (visible(field) && !accessibleName(field)) problems.push(`campo sem nome acessível: ${describe(field)}`);
    }
    for (const control of document.querySelectorAll('button, a[href], [role=button], [role=link], [role=option]')) {
      if (!visible(control)) continue;
      const text = control.textContent.replace(/\s+/g, ' ').trim();
      const imageAlt = [...control.querySelectorAll('img[alt]')].map((img) => img.alt).join(' ').trim();
      if (!text && !imageAlt && !accessibleName(control)) problems.push(`controle sem nome acessível: ${describe(control)}`);
    }
    for (const control of document.querySelectorAll('[role=button], [role=link]')) {
      if (visible(control) && !/^(a|button)$/i.test(control.tagName) && control.tabIndex < 0) {
        problems.push(`role interativo fora da ordem de tabulação: ${describe(control)}`);
      }
    }
    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) problems.push(`imagem sem alt: ${describe(image)}`);
    }
    for (const element of document.querySelectorAll('[tabindex]')) {
      if (Number(element.getAttribute('tabindex')) > 0) problems.push(`tabindex positivo: ${describe(element)}`);
    }
    const ids = new Map();
    for (const element of document.querySelectorAll('[id]')) ids.set(element.id, (ids.get(element.id) || 0) + 1);
    for (const [id, count] of ids) if (count > 1) problems.push(`id duplicado: #${id} (${count}x)`);
    for (const attribute of ['aria-labelledby', 'aria-controls', 'aria-describedby']) {
      for (const element of document.querySelectorAll(`[${attribute}]`)) {
        for (const id of element.getAttribute(attribute).split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) problems.push(`${attribute} aponta para id inexistente "${id}": ${describe(element)}`);
        }
      }
    }
    return problems;
  });
}
