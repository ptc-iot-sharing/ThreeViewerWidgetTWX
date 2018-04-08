import { TWProperty, TWService, ThingworxRuntimeWidget } from './support/widgetRuntimeSupport';

@ThingworxRuntimeWidget
class DemoWebpackWidget extends TWRuntimeWidget {
    serviceInvoked(name: string): void {
        throw new Error("Method not implemented.");
    }


    renderHtml(): string {
        return '<div class="widget-content widget-ThreeModelViewer"><div class="spinner"></div><canvas></canvas><div class="inset"></div><div class="stats"></div></div>';
    };

    async afterRender(): Promise<void> {
        
    }

    updateProperty(info: TWUpdatePropertyInfo): void {
    }

    handleSelectionUpdate?(property: string, selectedRows: any[], selectedRowIndices: number[]): void {
        switch (property) {
            // one handle single selection
            case "SceneTree":
                if (selectedRows.length > 0) {
                    // find the object that has this id
                    var selectedObject = scene.getObjectById(selectedRows[0].id);
                    selectedObject.oldMaterial = selectedObject.material;
                    selectedObject.material = selMaterial;
                }
                break;

            default:
                break;
        }
    }

    beforeDestroy?(): void {
        // resetting current widget
    }
}