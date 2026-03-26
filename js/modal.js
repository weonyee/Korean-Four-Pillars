/**
 * modal.js — Generic modal component.
 * Manages open/close state and renders dynamic content.
 */

export class Modal {
  /** @param {string} modalId — id of the modal root element */
  constructor(modalId) {
    this.el       = document.getElementById(modalId);
    this.closeBtn = this.el.querySelector('[data-modal-close]');
    this.ctaBtn   = this.el.querySelector('[data-modal-cta]');
    this._bindEvents();
  }

  open() {
    this.el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.el.classList.remove('open');
    document.body.style.overflow = '';
  }

  /**
   * Render content into named slots inside the modal.
   * @param {{ pillarsHtml: string, summaryHtml: string }} content
   */
  render({ pillarsHtml, summaryHtml }) {
    const pillarsSlot  = this.el.querySelector('[data-slot="pillars"]');
    const summarySlot  = this.el.querySelector('[data-slot="summary"]');
    if (pillarsSlot)  pillarsSlot.innerHTML  = pillarsHtml;
    if (summarySlot)  summarySlot.innerHTML  = summaryHtml;
  }

  _bindEvents() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.ctaBtn?.addEventListener('click',   () => this.close());
    // Close on backdrop click
    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });
    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.el.classList.contains('open')) this.close();
    });
  }
}
