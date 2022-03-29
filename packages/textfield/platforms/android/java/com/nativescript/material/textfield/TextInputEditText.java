package com.nativescript.material.textfield;

import android.content.Context;
import android.view.ViewGroup;
import android.os.IBinder;
import android.view.View;
import android.view.KeyEvent;
import android.util.AttributeSet;
import android.view.inputmethod.InputMethodManager;
import java.util.HashMap;

public class TextInputEditText extends com.google.android.material.textfield.TextInputEditText {
    private InputMethodManager imm;

    public TextInputEditText(Context context) {
        this(context, null);
    }
    public TextInputEditText(Context context, android.util.AttributeSet attrs) {
        super(context);
        imm = (InputMethodManager) context.getSystemService(Context.INPUT_METHOD_SERVICE);
    }

    static void handleClearFocus(View view) {
        final View root = view.getRootView();
        boolean oldValue = true;
        int oldDesc = ViewGroup.FOCUS_BEFORE_DESCENDANTS;

        if (root != null) {
            if (root instanceof ViewGroup) {
                oldDesc = ((ViewGroup) root).getDescendantFocusability();
                ((ViewGroup) root).setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
            }
            oldValue = root.isFocusable();
            root.setFocusable(false);
        }
        view.clearFocus();
        if (root != null) {
            root.setFocusable(oldValue);
            if (root instanceof ViewGroup) {
                ((ViewGroup) root).setDescendantFocusability(oldDesc);
            }
        }
    }

    void dismissSoftInput() {
        final IBinder windowToken = getWindowToken();
        if (imm != null && windowToken != null) {
            imm.hideSoftInputFromWindow(windowToken, 0);
        }
    }

    public void fullClearFocus() {
        dismissSoftInput();
        handleClearFocus(this);
    }

    public boolean dispatchKeyEventPreIme(KeyEvent event) {
        if (imm != null && imm.isActive() && event.getAction() == android.view.KeyEvent.ACTION_UP
                && event.getKeyCode() == android.view.KeyEvent.KEYCODE_BACK) {
            // when hiding the keyboard with the back button also blur
            fullClearFocus();
            return true;
        }
        return super.dispatchKeyEventPreIme(event);
    }

}