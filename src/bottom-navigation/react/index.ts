import { NSVElement, NativeScriptProps, registerElement } from 'react-nativescript';
import { warn } from 'react-nativescript/dist/shared/Logger';
import { BottomNavigation, SelectedIndexChangedEventData, TabContentItem, TabStrip } from '../';
import { TabNavigationBaseAttributes } from '@nativescript-community/ui-material-core-tabs/react';

// ui/bottom-navigation/bottom-navigation.d.ts
export type BottomNavigationAttributes = TabNavigationBaseAttributes & {
    android?: any;
    ios?: any;
    items?: TabContentItem[];
    onSelectedIndexChanged?: (args: SelectedIndexChangedEventData) => void;
    selectedIndex?: number;
    tabStrip?: TabStrip;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/prefer-namespace-keyword
    module JSX {
        interface IntrinsicElements {
            bottomNavigation: NativeScriptProps<BottomNavigationAttributes, BottomNavigation>;
        }
        interface ElementChildrenAttribute {
            children: {};
        }
    }
}

let installed: boolean = false;

interface RegisterBottomNavigationOptions {
    enableDebugLogging?: boolean;
}

export function registerBottomNavigation(opts: RegisterBottomNavigationOptions = {}): void {
    const { enableDebugLogging = false } = opts;

    if (installed) {
        return;
    }
    registerElement(
        'bottomNavigation',
        // @ts-ignore I can assure that this really does extend ViewBase
        () => BottomNavigation,
        {
            // TODO: share the same NodeOps for both BottomNavigation and Tabs; they're identical as they both extend TabNavigationBase.
            nodeOps: {
                insert(child: NSVElement, parent: NSVElement<BottomNavigation>, atIndex?: number): void {
                    const bottomNavigation = parent.nativeView;

                    if (child.nodeRole === 'tabStrip') {
                        if (child.nativeView instanceof TabStrip) {
                            bottomNavigation.tabStrip = child.nativeView;
                        } else {
                            if (enableDebugLogging) {
                                warn(`Unable to add child "${child.nativeView.constructor.name}" as the tabStrip of <bottomNavigation> as it is not an instance of TabStrip.`);
                            }
                        }
                    } else if (child.nodeRole === 'items') {
                        if (child.nativeView instanceof TabContentItem === false) {
                            if (enableDebugLogging) {
                                warn(`Unable to add child "${child.nativeView.constructor.name}" to the items of <bottomNavigation> as it is not an instance of TabContentItem.`);
                            }
                            return;
                        }

                        const items = bottomNavigation.items || []; // Annoyingly, it's the consumer's responsibility to ensure there's an array there!

                        if (typeof atIndex === 'undefined' || atIndex === items.length) {
                            bottomNavigation._addChildFromBuilder('items', child.nativeView as TabContentItem);
                        } else {
                            const itemsClone = items.slice();
                            itemsClone.splice(atIndex, 0, child.nativeView as TabContentItem);
                            bottomNavigation.items = itemsClone;
                        }
                    } else if (child.nodeRole === 'item') {
                        if (enableDebugLogging) {
                            warn(`Unable to add child "${child.nativeView.constructor.name}" to <bottomNavigation> as it had the nodeRole "item"; please correct it to "items".`);
                        }
                    } else {
                        if (enableDebugLogging) {
                            warn(
                                `Unable to add child "${child.nativeView.constructor.name}" to <bottomNavigation> as it does not have a nodeRole specified; ` +
                                    'please set a nodeRole of "tabStrip", or "items".'
                            );
                        }
                    }
                },
                remove(child: NSVElement, parent: NSVElement<BottomNavigation>): void {
                    const tabs = parent.nativeView;

                    if (child.nodeRole === 'tabStrip') {
                        tabs.tabStrip = null; // Anything falsy should work.
                    } else if (child.nodeRole === 'items') {
                        tabs.items = (tabs.items || []).filter((i) => i !== child.nativeView);
                    } else if (child.nodeRole === 'item') {
                        if (enableDebugLogging) {
                            warn(`Unable to remove child "${child.nativeView.constructor.name}" from <bottomNavigation> as it had the nodeRole "item"; please correct it to "items".`);
                        }
                    } else {
                        if (enableDebugLogging) {
                            warn(
                                `Unable to remove child "${child.nativeView.constructor.name}" from <bottomNavigation> as it does not have a nodeRole specified; ` +
                                    'please set a nodeRole of "tabStrip", or "items"'
                            );
                        }
                    }
                }
            }
        }
    );

    installed = true;
}
