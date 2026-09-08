/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { React } from "../../webpack/react";

function CopyButton({ fileContents, bytesLeft = 0 }: { fileContents?: string; bytesLeft?: number }) {
    const [copied, setCopied] = React.useState(false);
    const disabled = typeof fileContents !== "string" || bytesLeft > 0;

    return (
        <button
            type="button"
            title={disabled ? "Dosya kopyalanamayacak kadar büyük" : copied ? "Kopyalandı" : "Dosya içeriğini kopyala"}
            disabled={disabled}
            onClick={() => {
                if (disabled) return;
                void navigator.clipboard.writeText(fileContents).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                });
            }}
            style={{ all: "unset", cursor: disabled ? "not-allowed" : "pointer", marginLeft: 12, opacity: disabled ? 0.5 : 1 }}
        >
            {copied ? "✓" : "⧉"}
        </button>
    );
}

export default definePlugin({
    name: "CopyFileContents",
    description: "Metin dosyası önizlemelerine içeriği kopyalama düğmesi ekler",
    authors: [Devs.Berk],
    tags: ["dosya", "yardımcı"],

    patches: [{
        find: "#{intl::PREVIEW_BYTES_LEFT}",
        reason: "Dosya metni ve kalan bayt sayısı yalnız önizleme bileşeninin yerel props alanlarında mevcut.",
        replacement: [
            {
                match: /fileContents:(\i),bytesLeft:(\i)\}\):null,/,
                replace: "$&$self.renderCopyButton({fileContents:$1,bytesLeft:$2}),"
            },
            {
                match: /align:"\i"\}\),(?=\(0,\i\.jsx\)\(\i,\{wordWrap:\i,setWordWrap:\i)/,
                replace: "$&$self.renderCopyButton(arguments[0]),"
            }
        ]
    }],

    renderCopyButton(props: { fileContents?: string; bytesLeft?: number }) {
        return <CopyButton {...props} />;
    }
});
