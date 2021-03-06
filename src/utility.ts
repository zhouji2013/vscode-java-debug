// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { logger, Type } from "./logger";

const TROUBLESHOOTING_LINK = "https://github.com/Microsoft/vscode-java-debug/blob/master/Troubleshooting.md";
const LEARN_MORE = "Learn More";

export class UserError extends Error {
    public context: ITroubleshootingMessage;

    constructor(context: ITroubleshootingMessage) {
        super(context.message);
        this.context = context;
    }
}

interface IProperties {
    [key: string]: string;
}

interface ILoggingMessage {
    message: string;
    type?: Type;
    details?: IProperties;
}

interface ITroubleshootingMessage extends ILoggingMessage {
    anchor?: string;
}

function logMessage(message: ILoggingMessage): void {
    if (!message.type) {
        return;
    }

    if (message.details) {
        logger.log(message.type, message.details);
    } else {
        logger.logMessage(message.type, message.message);
    }
}

export async function showInformationMessage(message: ILoggingMessage, ...items: string[]): Promise<string | undefined> {
    logMessage(message);
    return await vscode.window.showInformationMessage(message.message, ...items);
}

export async function showWarningMessage(message: ILoggingMessage, ...items: string[]): Promise<string | undefined> {
    logMessage(message);
    return await vscode.window.showWarningMessage(message.message, ...items);
}

export async function showErrorMessage(message: ILoggingMessage, ...items: string[]): Promise<string | undefined> {
    logMessage(message);
    return await vscode.window.showErrorMessage(message.message, ...items);
}

export async function showInformationMessageWithTroubleshooting(message: ITroubleshootingMessage, ...items: string[]): Promise<string | undefined> {
    const choice = await showInformationMessage(message, ...items, LEARN_MORE);
    return handleTroubleshooting(choice, message.message, message.anchor);
}

export async function showWarningMessageWithTroubleshooting(message: ITroubleshootingMessage, ...items: string[]): Promise<string | undefined> {
    const choice = await showWarningMessage(message, ...items, LEARN_MORE);
    return handleTroubleshooting(choice, message.message, message.anchor);
}

export async function showErrorMessageWithTroubleshooting(message: ITroubleshootingMessage, ...items: string[]): Promise<string | undefined> {
    const choice = await showErrorMessage(message, ...items, LEARN_MORE);
    return handleTroubleshooting(choice, message.message, message.anchor);
}

function handleTroubleshooting(choice: string, message: string, anchor: string): string | undefined {
    if (choice === LEARN_MORE) {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(anchor ? `${TROUBLESHOOTING_LINK}#${anchor}` : TROUBLESHOOTING_LINK));
        logger.log(Type.USAGEDATA, {
            troubleshooting: "yes",
            troubleshootingMessage: message,
        });
        return;
    }

    return choice;
}

export function formatErrorProperties(ex: any): IProperties {
    const exception = (ex && ex.data && ex.data.cause)
        || { stackTrace: (ex && ex.stack), detailMessage: String((ex && ex.message) || ex || "Unknown exception") };

    const properties = {
        message: "",
        stackTrace: "",
    };

    if (exception && typeof exception === "object") {
        properties.message = exception.detailMessage;
        properties.stackTrace = (Array.isArray(exception.stackTrace) && JSON.stringify(exception.stackTrace))
            || String(exception.stackTrace);
    } else {
        properties.message = String(exception);
    }

    return properties;
}

export async function getJavaHome(): Promise<string> {
    const extension = vscode.extensions.getExtension("redhat.java");
    try {
        const extensionApi = await extension.activate();
        if (extensionApi && extensionApi.javaRequirement) {
            return extensionApi.javaRequirement.java_home;
        }
    } catch (ex) {
    }

    return "";
}
