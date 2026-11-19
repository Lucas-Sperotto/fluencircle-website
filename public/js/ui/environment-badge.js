/**
 * @file Selo do ambiente de teste (Firebase Emulator).
 *
 * Em endereço local a página usa o Emulator; o selo deixa isso visível para
 * quem testa e para os testes E2E (que conferem o texto). Em produção a
 * configuração não tem `badge` e nada é desenhado.
 */
import { h, byId } from './dom.js';
import { currentEnvironment } from '../config/environment.js';

/** Desenha o selo uma única vez, no fim da página (faixa fixa no rodapé). */
export function mountEnvironmentBadge() {
  if (!currentEnvironment.badge || byId('environment-badge')) return;
  document.body.append(h('div', {
    id: 'environment-badge',
    class: 'environment-badge',
    role: 'status',
    dataset: { environment: currentEnvironment.name },
  }, currentEnvironment.badge));
}
