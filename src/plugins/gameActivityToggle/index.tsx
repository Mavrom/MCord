/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { getUserSettingLazy } from "../../api/userSettings";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { Menu, Popout, React, useState, useStateFromStores } from "../../webpack/common";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "../../webpack/lazy";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `GameActivityToggle` plugin'inin
 * birebir portu.
 *
 * Eski MCord sürümü DOM enjeksiyonu yapıyordu (`MutationObserver` + CSS sınıf
 * adı tahmini) ve panel satırını bulamayıp "oyun etkinliği düğmesi eklenemedi"
 * uyarısı basıyordu. Vencord bunu **kod patch'iyle** yapıyor: düğme doğrudan
 * hesap panelinin `children` dizisine ekleniyor, DOM zamanlamasından bağımsız
 * ve CI reporter tarafından doğrulanıyor.
 */

interface ConnectedAccount {
    id: string;
    type: string;
    revoked: boolean;
    showActivity: boolean;
}

/** Mikrofon/kulaklık düğmeleriyle aynı panel düğmesi bileşeni. */
const PanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const ConnectedAccountsStore = findStoreLazy("ConnectedAccountsStore") as any;
const ConnectedAccountActions = findByPropsLazy("setShowActivity") as any;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame");

const settings = definePluginSettings({
    oldIcon: {
        type: OptionType.BOOLEAN,
        description: "Discord ikon yenilemesinden önceki eski ikon stilini kullan",
        default: false
    }
});

const GAMEPAD = "M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345 .855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345 .855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z";

function Icon() {
    const { oldIcon } = settings.use(["oldIcon"]);
    const showCurrentGame = ShowCurrentGame.useSetting();

    const redLinePath = !oldIcon
        ? "M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4Z"
        : "M23 2.27 21.73 1 1 21.73 2.27 23 23 2.27Z";

    const maskBlackPath = !oldIcon
        ? "M23.27 4.73 19.27 .73 -.27 20.27 3.73 24.27Z"
        : "M23.27 4.54 19.46.73 .73 19.46 4.54 23.27 23.27 4.54Z";

    return (
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path
                fill={!showCurrentGame && !oldIcon ? "var(--status-danger)" : "currentColor"}
                mask={!showCurrentGame ? "url(#mcordGameActivityMask)" : void 0}
                d={GAMEPAD}
            />
            {!showCurrentGame && <>
                <path fill="var(--status-danger)" d={redLinePath} />
                <mask id="mcordGameActivityMask">
                    <rect fill="white" x="0" y="0" width="24" height="24" />
                    <path fill="black" d={maskBlackPath} />
                </mask>
            </>}
        </svg>
    );
}

function GameActivityToggleButton(props: { nameplate?: any; }) {
    const showCurrentGame = ShowCurrentGame.useSetting();

    const connectedAccounts: ConnectedAccount[] = useStateFromStores(
        [ConnectedAccountsStore],
        () => ConnectedAccountsStore.getAccounts()
    );
    const spotifyAccounts = connectedAccounts.filter(account => account.type === "spotify" && !account.revoked);
    // Güncelleme bir API isteği; store'a yansıması gecikiyor, o yüzden anlık
    // geri bildirim için kendi durumumuzu tutuyoruz.
    const [shareSpotifyActivity, setShareSpotifyActivity] = useState(spotifyAccounts[0]?.showActivity ?? false);

    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    const buttonProps = {
        tooltipText: showCurrentGame ? "Oyun etkinliğini gizle" : "Oyun etkinliğini göster",
        icon: Icon,
        role: "switch",
        ariaChecked: !showCurrentGame,
        redGlow: !showCurrentGame,
        plated: props?.nameplate != null,
        onClick: () => ShowCurrentGame.updateSetting((old: boolean) => !old)
    };

    // Yalnız tek bir Spotify hesabı bağlıysa anahtar gösteriliyor; aksi halde
    // hangi hesap olduğu belirsiz kalıyor.
    if (spotifyAccounts.length !== 1) {
        return <PanelButton {...buttonProps} />;
    }

    const spotifyAccount = spotifyAccounts[0];

    return (
        <Popout
            position="top"
            align="left"
            targetElementRef={buttonRef}
            renderPopout={({ closePopout }: any) => (
                <Menu.Menu navId="mcord-gameActivityToggle-menu" onClose={closePopout}>
                    <Menu.MenuCheckboxItem
                        id="mcord-toggle-spotify"
                        label="Spotify etkinliğini paylaş"
                        checked={shareSpotifyActivity}
                        action={() => {
                            ConnectedAccountActions.setShowActivity(spotifyAccount.type, spotifyAccount.id, !shareSpotifyActivity);
                            setShareSpotifyActivity(!shareSpotifyActivity);
                        }}
                    />
                </Menu.Menu>
            )}
        >
            {(popoutProps: any) => (
                <PanelButton
                    ref={buttonRef}
                    onContextMenu={popoutProps.onClick}
                    {...buttonProps}
                />
            )}
        </Popout>
    );
}

const MANAGED_STYLE = `
[class*="panels"] [class*="accountPopoutButtonWrapper"] {
    min-width: 0;
}
`.trim();

export default definePlugin({
    name: "GameActivityToggle",
    description: "Mikrofon ve kulaklık düğmelerinin yanına oyun etkinliği paylaşımını açıp kapatan bir düğme ekler. Sağ tıkla Spotify etkinliğini değiştir.",
    authors: [Devs.Berk],
    tags: ["aktivite", "kısayol"],
    dependencies: ["UserSettingsAPI"],
    settings,
    requiresRestart: true,

    managedStyle: MANAGED_STYLE,

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            reason: "Mikrofon/kulaklık düğmelerinin bulunduğu hesap paneli satırı.",
            replacement: {
                match: /children:\[(?=.{0,25}?accountContainerRef)/,
                replace: "children:[$self.GameActivityToggleButton(arguments[0]),"
            }
        }
    ],

    GameActivityToggleButton: ErrorBoundary.wrap(GameActivityToggleButton, { noop: true })
});
