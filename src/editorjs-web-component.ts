/**
 * EditorJS Web Component
 *
 * A custom element that wraps Editor.js inside a Shadow DOM,
 * enabling use in frameworks that require Shadow DOM encapsulation
 * (e.g., Umbraco 17 packages using Lit-based web components).
 *
 * Usage:
 *   <editorjs-component></editorjs-component>
 *
 * Or programmatically:
 *   const el = document.createElement('editorjs-component');
 *   el.config = { tools: { ... }, data: { ... } };
 *   document.body.appendChild(el);
 */
import EditorJS from './codex';
import type { EditorConfig, OutputData } from '../types';

export class EditorJSComponent extends HTMLElement {
  /**
   * Editor.js instance
   */
  private editor: EditorJS | null = null;

  /**
   * User-provided configuration
   */
  private _config: Partial<EditorConfig> = {};

  /**
   * Internal holder element inside shadow DOM
   */
  private holderEl: HTMLDivElement | null = null;

  /**
   * Whether the component has been connected and initialized
   */
  private initialized = false;

  /**
   * Set the Editor.js configuration.
   * Can be called before or after the element is connected to the DOM.
   */
  set config(value: Partial<EditorConfig>) {
    this._config = value;

    if (this.initialized) {
      this.destroyEditor();
      this.initEditor();
    }
  }

  get config(): Partial<EditorConfig> {
    return this._config;
  }

  /**
   * Called when the element is added to the DOM
   */
  connectedCallback(): void {
    if (!this.initialized) {
      this.setupShadowDOM();
      this.initEditor();
      this.initialized = true;
    }
  }

  /**
   * Called when the element is removed from the DOM
   */
  disconnectedCallback(): void {
    this.destroyEditor();
  }

  /**
   * Creates the shadow DOM structure
   */
  private setupShadowDOM(): void {
    const shadowRoot = this.attachShadow({ mode: 'open' });

    /**
     * Create holder element for Editor.js
     */
    this.holderEl = document.createElement('div');
    this.holderEl.id = 'editorjs-holder';
    this.holderEl.style.width = '100%';
    this.holderEl.style.minHeight = '100px';

    shadowRoot.appendChild(this.holderEl);
  }

  /**
   * Initialize the Editor.js instance
   */
  private initEditor(): void {
    if (!this.holderEl || !this.shadowRoot) {
      return;
    }

    const editorConfig: EditorConfig = {
      ...this._config,
      holder: this.holderEl,
      shadowRoot: this.shadowRoot,
    } as EditorConfig;

    this.editor = new EditorJS(editorConfig);
  }

  /**
   * Destroy the current Editor.js instance
   */
  private destroyEditor(): void {
    if (this.editor && typeof this.editor.destroy === 'function') {
      this.editor.destroy();
      this.editor = null;
    }
  }

  /**
   * Save the editor content
   *
   * @returns Promise resolving to the output data
   */
  public async save(): Promise<OutputData | undefined> {
    if (!this.editor) {
      return undefined;
    }

    await this.editor.isReady;

    return (this.editor as any).save?.();
  }

  /**
   * Get the Editor.js instance (available after isReady resolves)
   */
  public getEditor(): EditorJS | null {
    return this.editor;
  }

  /**
   * Promise that resolves when editor is ready
   */
  public get isReady(): Promise<void> | undefined {
    return this.editor?.isReady;
  }
}

/**
 * Register the custom element
 */
if (!customElements.get('editorjs-component')) {
  customElements.define('editorjs-component', EditorJSComponent);
}

export default EditorJSComponent;
