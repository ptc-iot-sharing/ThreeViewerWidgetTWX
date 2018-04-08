/// <reference path="three_renderer/ModelRenderer.ts" />

import { TWProperty, TWService, ThingworxRuntimeWidget } from './support/widgetRuntimeSupport';
import { ModelRenderer, RendererOptions } from './three_renderer/ModelRenderer';

@ThingworxRuntimeWidget
class ThreeModelViewer extends TWRuntimeWidget {
    updateProperty(info: TWUpdatePropertyInfo): void {
    }
    /**
     * Main renderer taking care of displaying the model
     */
    modelRenderer: ModelRenderer;

    renderHtml(): string {
        return '<div class="widget-content widget-ThreeModelViewer"><div class="spinner"></div><div class="inset"></div><div class="stats"></div></div>';
    };

    @TWProperty("ModelUrl")
    set modelUrl(value: string) {
        this.modelRenderer.loadModel(value, this.getProperty("ModelType"), this.getProperty("TexturePath"));
    };

    async afterRender(): Promise<void> {
        require("./styles/ThreeModelViewer.runtime.css");
        let renderer = await import('./three_renderer/ModelRenderer');
        this.modelRenderer = new renderer.ModelRenderer(this.jqElement[0], this.widgetPropertiesToOptions());
        this.modelRenderer.render();
    }

    widgetPropertiesToOptions(): RendererOptions {
        let backgroundStyle = TW.getStyleFromStyleDefinition(this.getProperty('BackgroundStyle', ''));
        let backgroundColor = backgroundStyle.backgroundColor ? backgroundStyle.backgroundColor : "rgba(222,224,225,0.3)";

        return {
            controls: {
                cameraAutoRotate: this.getProperty("CameraAutoRotate"),
                cameraControls: this.getProperty("CameraControls"),
                enableSelection: this.getProperty("EnableSelection"),
                transformControls: this.getProperty("TransformControls")
            },
            helpers: {
                drawAxesHelpers: this.getProperty("DrawAxisHelpers"),
                drawGridHelpers: this.getProperty("DrawGridHelpers"),
                showDataLoading: this.getProperty("ShowDataLoading"),
                showStats: this.getProperty("ShowStats")
            },
            style: {
                backgroundColor: backgroundColor,
                lightIntensity: this.getProperty("LightIntensity"),
                selectedMaterial: '0x00d9ff'
            },
            position: {
                modelYOffset: this.getProperty("ModelYOffset")
            },
            callbacks: {
                loadedSucessful: () => {
                    this.jqElement.triggerHandler("LoadDone");
                },
                loadingError: () => {
                    this.jqElement.triggerHandler("LoadError");
                }
            }
        }
    }

    handleSelectionUpdate?(property: string, selectedRows: any[], selectedRowIndices: number[]): void {
        switch (property) {
            // one handle single selection
            case "SceneTree":
                if (selectedRows.length > 0) {
                    // find the object that has this id
                    //  var selectedObject = scene.getObjectById(selectedRows[0].id);
                    //selectedObject.oldMaterial = selectedObject.material;
                    // selectedObject.material = selMaterial;
                }
                break;

            default:
                break;
        }
    }

    serviceInvoked(name: string): void {
        throw new Error("Method not implemented.");
    }
    beforeDestroy?(): void {
        // resetting current widget
    }
}