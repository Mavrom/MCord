/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Her host'ta güvenle silinebilen izleme parametreleri.
 *
 * Bunlar yalnızca analitik/kampanya kimlikleri; içerik seçimini etkilemezler.
 * Tek harfli genel parametreler (`s`, `t`, `si` …) burada YOK — onlar host'a
 * bağlı olarak anlam taşıyabildiği için `HOST_RULES` altında ele alınıyor.
 */
export const GLOBAL_PARAMS: ReadonlySet<string> = new Set([
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_name", "utm_cid", "utm_reader", "utm_referrer", "utm_id",
    "utm_social", "utm_social_type", "utm_brand",
    "gclid", "dclid", "gclsrc", "wbraid", "gbraid",
    "fbclid", "fb_action_ids", "fb_action_types", "fb_ref", "fb_source",
    "msclkid", "mc_cid", "mc_eid",
    "twclid", "igshid", "igsh", "ttclid", "yclid", "_openstat",
    "vero_conv", "vero_id", "wickedid", "oly_anon_id", "oly_enc_id",
    "_hsenc", "_hsmi", "__hssc", "__hstc", "__hsfp", "hsCtaTracking",
    "mkt_tok", "trk", "trkCampaign", "ref_src", "ref_url",
    "action_object_map", "action_type_map", "action_ref_map",
    "spm", "scm"
]);

/** `utm_` ve benzeri önek grupları. */
export const GLOBAL_PREFIXES: readonly string[] = [
    "utm_", "pk_", "piwik_", "matomo_", "hmb_"
];

/**
 * Host soneki → o host'ta silinecek ek parametreler.
 *
 * Eşleşme sonek bazlı: `youtube.com` kaydı `www.youtube.com` ve
 * `music.youtube.com` için de geçerli.
 */
export const HOST_RULES: Record<string, readonly string[]> = {
    "amazon.com": ["ref", "ref_", "pd_rd_r", "pd_rd_w", "pd_rd_wg", "pf_rd_p", "pf_rd_r", "psc", "tag", "linkCode", "linkId", "ascsubtag", "smid", "content-id", "dib", "dib_tag", "qid", "sr", "sprefix", "th", "_encoding"],
    "amazon.co.uk": ["ref", "ref_", "tag", "linkCode", "linkId", "psc", "th"],
    "amazon.de": ["ref", "ref_", "tag", "linkCode", "linkId", "psc", "th"],
    "youtube.com": ["si", "feature", "kw", "pp"],
    "youtu.be": ["si", "feature"],
    "twitter.com": ["s", "t", "cxt"],
    "x.com": ["s", "t", "cxt"],
    "spotify.com": ["si", "context", "nd"],
    "reddit.com": ["share_id", "correlation_id", "ref", "ref_source", "ref_campaign", "$deep_link", "$web_only", "%24deep_link", "%24web_only"],
    "tiktok.com": ["_r", "_t", "is_from_webapp", "sender_device", "web_id", "u_code", "preview_pb", "share_app_id"],
    "instagram.com": ["igshid", "igsh"],
    "google.com": ["ved", "usg", "sa", "sca_esv", "source", "ei", "gs_lcp"]
};
