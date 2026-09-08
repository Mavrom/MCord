/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { c, radius, s, shadow, space } from "../../components/theme";
import { Tooltip } from "../../components/Tooltip";
import { getReactDOMClient, React } from "../../webpack/react";
import {
    candidateGuilds,
    type Data,
    doClone,
    guildAcronym,
    guildIconUrl,
    mediaUrl,
    safeEmojiName
} from "./clone";

const CONTAINER_ID = "mcord-clone-modal";

function validateName(data: Data, value: string): string | null {
    if (data.t === "Emoji") {
        if (!/^[A-Za-z0-9_]+$/.test(value)) return "Yalnızca harf, rakam ve alt çizgi";
        if (value.length < 2 || value.length > 32) return "2–32 karakter olmalı";
        return null;
    }
    if (value.length < 2 || value.length > 30) return "2–30 karakter olmalı";
    return null;
}

function CloneModal({ data, onClose }: { data: Data; onClose(): void }) {
    const initialName = data.t === "Emoji" ? safeEmojiName(data.name) : data.name;
    const [name, setName] = React.useState(initialName);
    const [cloning, setCloning] = React.useState(false);
    const [, bump] = React.useReducer((n: number) => n + 1, 0);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // İlk açılışta sanitize edilmiş adı uygula + ad alanını seçili odakla ki
    // kullanıcı hemen yeni ad yazabilsin (Discord'un odak tuzağına karşı gecikmeli).
    React.useEffect(() => {
        data.name = initialName;
        const timer = setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 60);
        return () => clearTimeout(timer);
    }, []);

    const guilds = React.useMemo(() => candidateGuilds(), [bump]);
    const error = validateName(data, name);

    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !cloning) {
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, cloning]);

    const cloneTo = (guildId: string) => {
        if (cloning || error) return;
        setCloning(true);
        data.name = name;
        void doClone(guildId, data)
            .then(() => onClose())
            .catch(() => { setCloning(false); bump(); });
    };

    return (
        <div
            className="mcord-root mcord-enter"
            onMouseDown={() => !cloning && onClose()}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100050,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, .5)",
                padding: space.xl
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                onMouseDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "min(520px, 100%)",
                    maxHeight: "min(640px, 88vh)",
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.lg,
                    boxShadow: shadow.high,
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: space.sm,
                        padding: `${space.md} ${space.lg}`,
                        borderBottom: `1px solid ${c.border}`
                    }}
                >
                    <img
                        src={mediaUrl(data, 96)}
                        alt=""
                        width={26}
                        height={26}
                        style={{ borderRadius: "6px", flex: "0 0 auto", objectFit: "contain" }}
                    />
                    <div style={{ flex: 1, minWidth: 0, color: c.heading, fontWeight: 700, fontSize: "16px" }}>
                        {data.t === "Emoji" ? "Emojiyi klonla" : "Çıkartmayı klonla"}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: space.md,
                        padding: space.lg,
                        overflowY: "auto",
                        minHeight: 0,
                        opacity: cloning ? 0.6 : 1,
                        pointerEvents: cloning ? "none" : "auto"
                    }}
                >
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ ...s.faint, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
                            {data.t === "Emoji" ? "Emoji adı — istediğin gibi değiştir" : "Çıkartma adı — istediğin gibi değiştir"}
                        </span>
                        <input
                            ref={inputRef}
                            autoFocus
                            spellCheck={false}
                            placeholder={initialName}
                            style={{ ...s.input, borderColor: error ? c.danger : c.border }}
                            value={name}
                            onKeyDown={event => { if (event.key !== "Escape") event.stopPropagation(); }}
                            onChange={event => {
                                const next = event.currentTarget.value;
                                setName(next);
                                data.name = next;
                            }}
                        />
                        {error && <span style={{ ...s.faint, color: c.danger }}>{error}</span>}
                    </label>

                    <div style={{ ...s.faint, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
                        Hedef sunucu ({guilds.length}) — tıkla, bu adla klonlansın
                    </div>

                    {guilds.length === 0
                        ? <div style={s.muted}>Emoji/çıkartma ekleyebileceğin bir sunucun yok.</div>
                        : (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: space.md,
                                    justifyContent: "center"
                                }}
                            >
                                {guilds.map(guild => {
                                    const icon = guildIconUrl(guild, 128);
                                    return (
                                        <Tooltip key={guild.id} text={guild.name}>
                                            <button
                                                type="button"
                                                aria-label={`${guild.name} sunucusuna klonla`}
                                                onClick={() => cloneTo(guild.id)}
                                                style={{
                                                    width: "56px",
                                                    height: "56px",
                                                    borderRadius: "50%",
                                                    border: `1px solid ${c.border}`,
                                                    background: c.surfaceRaised,
                                                    color: c.text,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    overflow: "hidden",
                                                    padding: 0,
                                                    fontFamily: "inherit",
                                                    fontSize: "13px",
                                                    fontWeight: 700
                                                }}
                                            >
                                                {icon
                                                    ? <img src={icon} alt="" width={56} height={56} style={{ objectFit: "cover" }} />
                                                    : guildAcronym(guild.name)}
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

let root: { unmount(): void } | null = null;

export function openCloneModal(data: Data): void {
    if (root != null) return;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);

    const close = () => {
        root?.unmount();
        container.remove();
        root = null;
    };

    try {
        const created = getReactDOMClient().createRoot(container);
        created.render(<CloneModal data={data} onClose={close} />);
        root = { unmount: () => created.unmount() };
    } catch {
        container.remove();
        root = null;
    }
}
