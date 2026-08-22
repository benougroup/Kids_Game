/**
 * Landing Page - Clean entry point with scenario selection
 */

import { SCENARIOS, getScenariosByCategory, type GameScenario } from './Scenarios';

export class LandingPage {
  private container: HTMLDivElement;
  private onScenarioSelected: ((scenario: GameScenario) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'landing-page';
    this.render();
  }

  setOnScenarioSelected(callback: (scenario: GameScenario) => void) {
    this.onScenarioSelected = callback;
  }

  private render() {
    this.container.innerHTML = `
      <div class="landing-bg">
        <div class="landing-content">
          <div class="landing-header">
            <h1>Lumenfall</h1>
            <p class="subtitle">A Game Playground</p>
          </div>

          <div class="scenarios-container">
            <div class="scenario-section">
              <h2>🎮 Gameplay</h2>
              <div class="scenario-list">
                ${getScenariosByCategory('gameplay')
                  .map(s => this.renderScenarioButton(s))
                  .join('')}
              </div>
            </div>

            <div class="scenario-section">
              <h2>🧪 Testing Ground</h2>
              <p class="testing-note">Test specific mechanics and features</p>
              <div class="scenario-list">
                ${getScenariosByCategory('testing')
                  .map(s => this.renderScenarioButton(s))
                  .join('')}
              </div>
            </div>
          </div>

          <div class="landing-footer">
            <p>Use testing scenarios to verify features before playing</p>
          </div>
        </div>
      </div>
    `;

    // Attach click handlers
    SCENARIOS.forEach(scenario => {
      const btn = this.container.querySelector(`[data-scenario-id="${scenario.id}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.onScenarioSelected?.(scenario);
        });
      }
    });
  }

  private renderScenarioButton(scenario: GameScenario): string {
    return `
      <button class="scenario-btn" data-scenario-id="${scenario.id}">
        <div class="scenario-name">${scenario.name}</div>
        <div class="scenario-desc">${scenario.description}</div>
      </button>
    `;
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }

  getElement(): HTMLElement {
    return this.container;
  }
}
