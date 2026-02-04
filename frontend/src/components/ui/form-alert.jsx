
import React from 'react';
import { cn } from "@/lib/utils";

/**
 * Reusable alert component for form success/error messages
 * @param {string} type - 'success' or 'error'
 * @param {string} message - The message to display
 * @param {string} className - Optional additional classes
 */
export function FormAlert({ type = 'error', message, className }) {
    if (!message) return null;

    const isSuccess = type === 'success';

    return (
        <div
            className={cn(
                "rounded-md border px-3 py-2 text-sm mb-4",
                isSuccess
                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                className
            )}
        >
            {message}
        </div>
    );
}
