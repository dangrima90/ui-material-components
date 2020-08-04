import { IOSHelper, Page, Trace, Utils, View, fromObject } from '@nativescript/core';
import { applyMixins } from '@nativescript-community/ui-material-core';
import { BottomSheetOptions } from './bottomsheet';
import { ViewWithBottomSheetBase } from './bottomsheet-common';

export { ViewWithBottomSheetBase } from './bottomsheet-common';

const majorVersion = Utils.ios.MajorVersion;

declare class IMDCBottomSheetControllerDelegateImpl extends NSObject implements MDCBottomSheetControllerDelegate {
    static new(): IMDCBottomSheetControllerDelegateImpl;
    _owner: WeakRef<ViewWithBottomSheet>;
}

@NativeClass()
class MDCBottomSheetControllerDelegateImpl extends NSObject {
    static ObjCProtocols = [MDCBottomSheetControllerDelegate];
    _owner: WeakRef<ViewWithBottomSheet>;
    public static initWithOwner(owner: ViewWithBottomSheet) {
        const delegate = MDCBottomSheetControllerDelegateImpl.new() as MDCBottomSheetControllerDelegateImpl;
        delegate._owner = new WeakRef(owner);

        return delegate;
    }

    bottomSheetControllerDidDismissBottomSheet(controller: MDCBottomSheetController) {
        // called when clicked on background
        const owner = this._owner.get();
        if (owner) {
            owner._onDismissBottomSheetCallback && owner._onDismissBottomSheetCallback();
            if (owner && owner.isLoaded) {
                owner.callUnloaded();
            }
        }
    }
    bottomSheetControllerStateChangedState(controller: MDCBottomSheetController, state: MDCSheetState) {
        // called when swiped
        if (state === MDCSheetState.Closed) {
            const owner = this._owner.get();
            if (owner) {
                owner._onDismissBottomSheetCallback && owner._onDismissBottomSheetCallback();
                if (owner && owner.isLoaded) {
                    owner.callUnloaded();
                }
            }
        }
    }
}
function initLayoutGuide(controller: UIViewController) {
    const rootView = controller.view;
    const layoutGuide = UILayoutGuide.alloc().init();
    rootView.addLayoutGuide(layoutGuide);
    NSLayoutConstraint.activateConstraints([
        layoutGuide.topAnchor.constraintEqualToAnchor(controller.topLayoutGuide.bottomAnchor),
        layoutGuide.bottomAnchor.constraintEqualToAnchor(controller.bottomLayoutGuide.topAnchor),
        layoutGuide.leadingAnchor.constraintEqualToAnchor(rootView.leadingAnchor),
        layoutGuide.trailingAnchor.constraintEqualToAnchor(rootView.trailingAnchor),
    ] as any);

    return layoutGuide;
}
function layoutView(controller: IUILayoutViewController, owner: View): void {
    let layoutGuide = controller.view.safeAreaLayoutGuide;
    if (!layoutGuide) {
        Trace.write(`safeAreaLayoutGuide during layout of ${owner}. Creating fallback constraints, but layout might be wrong.`, Trace.categories.Layout, Trace.messageType.error);

        layoutGuide = initLayoutGuide(controller);
    }
    const safeArea = layoutGuide.layoutFrame;
    let position = IOSHelper.getPositionFromFrame(safeArea);
    const safeAreaSize = safeArea.size;

    const hasChildViewControllers = controller.childViewControllers.count > 0;
    if (hasChildViewControllers) {
        const fullscreen = controller.view.frame;
        position = IOSHelper.getPositionFromFrame(fullscreen);
    }

    const safeAreaWidth = Utils.layout.round(Utils.layout.toDevicePixels(safeAreaSize.width));
    const safeAreaHeight = Utils.layout.round(Utils.layout.toDevicePixels(safeAreaSize.height));

    const widthSpec = Utils.layout.makeMeasureSpec(safeAreaWidth, Utils.layout.EXACTLY);
    const heightSpec = Utils.layout.makeMeasureSpec(safeAreaHeight, Utils.layout.UNSPECIFIED);

    View.measureChild(null, owner, widthSpec, heightSpec);
    const marginTop = owner.effectiveMarginTop;
    const marginBottom = owner.effectiveMarginBottom;
    const marginLeft = owner.effectiveMarginLeft + position.left;
    const marginRight = owner.effectiveMarginRight;
    const top = marginTop + position.top;
    const width = owner.getMeasuredWidth();
    const height = owner.getMeasuredHeight();

    owner.iosOverflowSafeArea = false;

    View.layoutChild(null, owner, position.left, position.top, position.left + width, position.top + height);

    const effectiveWidth = width + marginLeft + marginRight;
    let effectiveHeight = height + top + marginBottom;
    if (controller.ignoreTopSafeArea || controller.ignoreBottomSafeArea) {
        const frame = owner.nativeViewProtected.frame;
        const availableSpace = getAvailableSpaceFromParent(owner, frame);
        // const safeArea = availableSpace.safeArea;
        // const fullscreen = availableSpace.fullscreen;
        // const inWindow = availableSpace.inWindow;

        const position = IOSHelper.getPositionFromFrame(frame);
        const fullscreenPosition = IOSHelper.getPositionFromFrame(availableSpace.fullscreen);
        const safeAreaPosition = IOSHelper.getPositionFromFrame(availableSpace.safeArea);

        const adjustedPosition = position;

        if (controller.ignoreTopSafeArea) {
            const delta = safeAreaPosition.top - fullscreenPosition.top;
            effectiveHeight -= delta;
            adjustedPosition.bottom -= delta;
            adjustedPosition.top -= delta;
        }
        if (controller.ignoreBottomSafeArea) {
            const delta = fullscreenPosition.bottom - safeAreaPosition.bottom;
            effectiveHeight -= delta;
            // adjustedPosition.bottom += delta * 2;
        }
        owner.nativeViewProtected.frame = CGRectMake(
            Utils.layout.toDeviceIndependentPixels(adjustedPosition.left),
            Utils.layout.toDeviceIndependentPixels(adjustedPosition.top),
            Utils.layout.toDeviceIndependentPixels(adjustedPosition.right - adjustedPosition.left),
            Utils.layout.toDeviceIndependentPixels(adjustedPosition.bottom - adjustedPosition.top)
        );
    }
    controller.preferredContentSize = CGSizeMake(Utils.layout.toDeviceIndependentPixels(effectiveWidth), Utils.layout.toDeviceIndependentPixels(effectiveHeight));

    if (owner.parent) {
        owner.parent._layoutParent();
    }
}
function getAvailableSpaceFromParent(view: View, frame: CGRect): { safeArea: CGRect; fullscreen: CGRect; inWindow: CGRect } {
    if (!view) {
        return null;
    }

    let scrollView = null;
    let viewControllerView = null;

    if (view.viewController) {
        viewControllerView = view.viewController.view;
    } else {
        let parent = view.parent as View;
        while (parent && !parent.viewController && !(parent.nativeViewProtected instanceof UIScrollView)) {
            parent = parent.parent as View;
        }

        if (parent.nativeViewProtected instanceof UIScrollView) {
            scrollView = parent.nativeViewProtected;
        } else if (parent.viewController) {
            viewControllerView = parent.viewController.view;
        }
    }

    let fullscreen = null;
    let safeArea = null;

    if (viewControllerView) {
        safeArea = viewControllerView.safeAreaLayoutGuide.layoutFrame;
        fullscreen = viewControllerView.frame;
    } else if (scrollView) {
        const insets = scrollView.safeAreaInsets;
        safeArea = CGRectMake(insets.left, insets.top, scrollView.contentSize.width - insets.left - insets.right, scrollView.contentSize.height - insets.top - insets.bottom);
        fullscreen = CGRectMake(0, 0, scrollView.contentSize.width, scrollView.contentSize.height);
    }

    const locationInWindow = view.getLocationInWindow();
    let inWindowLeft = locationInWindow.x;
    let inWindowTop = locationInWindow.y;

    if (scrollView) {
        inWindowLeft += scrollView.contentOffset.x;
        inWindowTop += scrollView.contentOffset.y;
    }

    const inWindow = CGRectMake(inWindowLeft, inWindowTop, frame.size.width, frame.size.height);

    return { safeArea, fullscreen, inWindow };
}

declare class IUILayoutViewController extends UIViewController {
    static new(): IUILayoutViewController;
    static alloc(): IUILayoutViewController;
    owner: WeakRef<View>;
    ignoreBottomSafeArea: boolean;
    ignoreTopSafeArea: boolean;
}

@NativeClass()
class UILayoutViewController extends UIViewController {
    owner: WeakRef<View>;
    ignoreBottomSafeArea: boolean;
    ignoreTopSafeArea: boolean;
    public static initWithOwner(owner: View) {
        const delegate = UILayoutViewController.new() as UILayoutViewController;
        delegate.owner = new WeakRef(owner);

        return delegate;
    }

    viewDidLoad(): void {
        super.viewDidLoad();

        // Unify translucent and opaque bars layout
        // this.edgesForExtendedLayout = UIRectEdgeBottom;
        this.extendedLayoutIncludesOpaqueBars = true;
    }

    viewWillLayoutSubviews(): void {
        super.viewWillLayoutSubviews();
        const owner = this.owner.get();
        if (owner) {
            IOSHelper.updateConstraints(this, owner);
        }
    }

    viewDidLayoutSubviews(): void {
        super.viewDidLayoutSubviews();
        const owner = this.owner.get();
        if (owner) {
            if (majorVersion >= 11) {
                // Handle nested UILayoutViewController safe area application.
                // Currently, UILayoutViewController can be nested only in a TabView.
                // The TabView itself is handled by the OS, so we check the TabView's parent (usually a Page, but can be a Layout).
                const tabViewItem = owner.parent;
                const tabView = tabViewItem && tabViewItem.parent;
                let parent = tabView && tabView.parent;

                // Handle Angular scenario where TabView is in a ProxyViewContainer
                // It is possible to wrap components in ProxyViewContainers indefinitely
                // Not using instanceof ProxyViewContainer to avoid circular dependency
                // TODO: Try moving UILayoutViewController out of view module
                while (parent && !parent.nativeViewProtected) {
                    parent = parent.parent;
                }
                const additionalInsets = { top: 0, left: 0, bottom: 0, right: 0 };

                if (parent) {
                    const parentPageInsetsTop = parent.nativeViewProtected.safeAreaInsets.top;
                    const currentInsetsTop = this.view.safeAreaInsets.top;
                    const additionalInsetsTop = Math.max(parentPageInsetsTop - currentInsetsTop, 0);

                    const parentPageInsetsBottom = parent.nativeViewProtected.safeAreaInsets.bottom;
                    const currentInsetsBottom = this.view.safeAreaInsets.bottom;
                    const additionalInsetsBottom = Math.max(parentPageInsetsBottom - currentInsetsBottom, 0);

                    if (additionalInsetsTop > 0 || additionalInsetsBottom > 0) {
                        additionalInsets.top = additionalInsetsTop;
                        additionalInsets.bottom = additionalInsetsBottom;
                    }
                }
                // if (this.ignoreTopSafeArea === true) {
                //     console.log('ignoreTopSafeArea', additionalInsets.top, this.view.safeAreaLayoutGuide.layoutFrame.origin.x, this.view.safeAreaInsets.top);
                //     additionalInsets.top += this.view.safeAreaLayoutGuide.layoutFrame.origin.x;
                // }

                // if (this.ignoreBottomSafeArea === true) {
                //     additionalInsets.bottom -= this.view.safeAreaInsets.bottom;
                // }

                const insets = new UIEdgeInsets(additionalInsets);
                this.additionalSafeAreaInsets = insets;
            }

            layoutView(this, owner);
        }
    }

    viewWillAppear(animated: boolean): void {
        super.viewWillAppear(animated);
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        IOSHelper.updateAutoAdjustScrollInsets(this, owner);

        if (!owner.parent) {
            owner.callLoaded();
        }
    }

    viewDidDisappear(animated: boolean): void {
        super.viewDidDisappear(animated);
        const owner = this.owner.get();
        if (owner && !owner.parent) {
            owner.callUnloaded();
        }
    }

    // Mind implementation for other controllers
    traitCollectionDidChange(previousTraitCollection: UITraitCollection): void {
        super.traitCollectionDidChange(previousTraitCollection);

        if (majorVersion >= 13) {
            const owner = this.owner.get();
            if (
                owner &&
                this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection &&
                this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection(previousTraitCollection)
            ) {
                owner.notify({ eventName: 'traitCollectionColorAppearanceChanged', object: owner });
            }
        }
    }
}

export class ViewWithBottomSheet extends ViewWithBottomSheetBase {
    bottomSheetControllerDelegate: IMDCBottomSheetControllerDelegateImpl;
    bottomSheetController: MDCBottomSheetController;
    protected _showNativeBottomSheet(parent: View, options: BottomSheetOptions) {
        options.context = options.context || {};
        const parentWithController = IOSHelper.getParentWithViewController(parent);
        if (!parentWithController) {
            Trace.write(`Could not find parent with viewController for ${parent} while showing bottom sheet view.`, Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }

        const parentController = parentWithController.viewController;
        if (parentController.presentedViewController) {
            Trace.write('Parent is already presenting view controller. Close the current bottom sheet page before showing another one!', Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }

        if (!parentController.view || !parentController.view.window) {
            Trace.write('Parent page is not part of the window hierarchy.', Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }
        this._setupAsRootView({});

        this._commonShowNativeBottomSheet(parentWithController, options);
        let controller: IUILayoutViewController = this.viewController;
        if (!controller) {
            const nativeView = this.ios || this.nativeViewProtected;
            controller = UILayoutViewController.initWithOwner(this);
            // newController = IOSHelper.UILayoutViewController.initWithOwner(new WeakRef(item.content)) as UIViewController;
            if (options.ignoreBottomSafeArea !== undefined) {
                controller.ignoreBottomSafeArea = options.ignoreBottomSafeArea;
            } else {
                controller.ignoreBottomSafeArea = false;
            }
            if (options.ignoreTopSafeArea !== undefined) {
                controller.ignoreTopSafeArea = options.ignoreTopSafeArea;
            } else {
                controller.ignoreTopSafeArea = true;
            }
            if (nativeView instanceof UIView) {
                controller.view.addSubview(nativeView);
            }

            this.viewController = controller; // store the viewController so that safeArea overflow is applied correctly
        }

        controller.modalPresentationStyle = UIModalPresentationStyle.FormSheet;

        // this.horizontalAlignment = 'stretch';
        // this.verticalAlignment = 'stretch';

        this._raiseShowingBottomSheetEvent();
        // animated = animated === undefined ? true : !!animated;
        const bottomSheet = (this.bottomSheetController = MDCBottomSheetController.alloc().initWithContentViewController(controller));
        this.bottomSheetControllerDelegate = bottomSheet.delegate = MDCBottomSheetControllerDelegateImpl.initWithOwner(this);
        bottomSheet.isScrimAccessibilityElement = true;
        bottomSheet.scrimAccessibilityLabel = 'close';
        bottomSheet.dismissOnBackgroundTap = options.dismissOnBackgroundTap !== false;
        bottomSheet.dismissOnDraggingDownSheet = options.dismissOnDraggingDownSheet !== false;

        if (options.trackingScrollView) {
            const scrollView = this.getViewById(options.trackingScrollView);
            if (scrollView && scrollView.nativeViewProtected instanceof UIScrollView) {
                bottomSheet.trackingScrollView = scrollView.nativeViewProtected;
            }
        }
        (controller as any).animated = true;
        parentController.presentViewControllerAnimatedCompletion(bottomSheet, true, null);
        if (options.transparent === true) {
            controller.view.backgroundColor = UIColor.clearColor;
            // for it to be more beautiful let s disable elevation
            controller.view['elevation'] = 0;
        } else if (!(this instanceof Page)) {
            controller.view.backgroundColor = majorVersion <= 12 && !UIColor.systemBackgroundColor ? UIColor.whiteColor : UIColor.systemBackgroundColor;
        }
        const transitionCoordinator = bottomSheet.transitionCoordinator;
        if (transitionCoordinator) {
            UIViewControllerTransitionCoordinator.prototype.animateAlongsideTransitionCompletion.call(transitionCoordinator, null, () => {
                this.bindingContext = fromObject(options.context);
                this._raiseShownBottomSheetEvent();
            });
        } else {
            // Apparently iOS 9+ stops all transitions and animations upon application suspend and transitionCoordinator becomes null here in this case.
            // Since we are not waiting for any transition to complete, i.e. transitionCoordinator is null, we can directly raise our shownInBottomSheet event.
            // Take a look at https://github.com/NativeScript/NativeScript/issues/2173 for more info and a sample project.
            this.bindingContext = fromObject(options.context);
            this._raiseShownBottomSheetEvent();
        }
    }

    _bottomSheetClosed() {
        if (this.bottomSheetController) {
            this.bottomSheetController.delegate = null;
            this.bottomSheetController = null;
        }
        this.bottomSheetControllerDelegate = null;
    }
    protected _hideNativeBottomSheet(parent: View, whenClosedCallback: () => void) {
        const parentWithController = IOSHelper.getParentWithViewController(parent);
        if (!parent || !parentWithController) {
            Trace.error('Trying to hide bottom-sheet view but no parent with viewController specified.');
            return;
        }

        const parentController = parentWithController.viewController;
        const animated = this.viewController.animated;
        parentController.dismissViewControllerAnimatedCompletion(animated, whenClosedCallback);
    }
}

let mixinInstalled = false;
export function overrideBottomSheet() {
    applyMixins(View, [ViewWithBottomSheetBase, ViewWithBottomSheet]);
}
export function install() {
    if (!mixinInstalled) {
        mixinInstalled = true;
        overrideBottomSheet();
    }
}
