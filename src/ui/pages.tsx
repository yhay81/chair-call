import { AREAS, HAIR_LENGTHS, KINDS, MENUS, PRODUCT } from "../config/product";
import type { PublicListing } from "../data/listing";
import { Footer, Header, Layout } from "./layout";

const areaLabel = new Map(AREAS.map((item) => [item.id, item.label]));
const kindLabel = new Map(KINDS.map((item) => [item.id, item.label]));
const menuLabel = new Map(MENUS.map((item) => [item.id, item.label]));
const hairLabel = new Map(HAIR_LENGTHS.map((item) => [item.id, item.label]));

function ChairStage() {
  return (
    <div class="chair-stage" aria-hidden="true">
      <span class="mirror"></span>
      <span class="chair-back"></span>
      <span class="chair-seat"></span>
      <span class="chair-stem"></span>
      <span class="chair-base"></span>
      <span class="dryer"></span>
      <span class="comb"></span>
    </div>
  );
}

export function HomePage() {
  return (
    <Layout appScript page="home">
      <Header />
      <main class="shell board-page">
        <section class="board-toolbar" aria-labelledby="board-title">
          <div class="toolbar-mark">
            <span class="scissor-mark" aria-hidden="true"></span>
            <div>
              <h2 id="board-title">モデル募集ボード</h2>
              <output id="listing-count" aria-live="polite">
                読み込み中
              </output>
            </div>
          </div>
          <label class="search-box">
            <span aria-hidden="true">⌕</span>
            <span hidden>駅名やサロン名で検索</span>
            <input
              id="listing-search"
              type="search"
              placeholder="駅名・サロン名"
              autocomplete="off"
            />
          </label>
          <div class="filter-strip" id="area-filter" aria-label="エリアで絞る">
            <button type="button" data-value="all" aria-pressed="true">
              すべて
            </button>
            {AREAS.map((area) => (
              <button type="button" data-value={area.id} aria-pressed="false">
                {area.label}
              </button>
            ))}
          </div>
          <div class="filter-strip menu-filter" id="menu-filter" aria-label="施術で絞る">
            <button type="button" data-value="all" aria-pressed="true">
              全施術
            </button>
            {MENUS.slice(0, 4).map((menu) => (
              <button type="button" data-value={menu.id} aria-pressed="false">
                {menu.label}
              </button>
            ))}
          </div>
          <label class="free-toggle">
            <input id="free-filter" type="checkbox" />
            <span>無料のみ</span>
          </label>
        </section>

        <div class="board-layout">
          <aside class="salon-rail">
            <ChairStage />
            <a class="rail-create" href="/create">
              <span class="ticket-plus" aria-hidden="true">
                +
              </span>
              <span>募集カードをつくる</span>
            </a>
            <div class="safety-slip">
              <span aria-hidden="true">✓</span>
              <p>前払いをせず、サロンと施術条件を連絡先で確認</p>
            </div>
          </aside>

          <section class="calls-panel" aria-label="募集中のカード">
            <div class="call-grid" id="call-grid"></div>
            <div class="board-empty" id="board-empty" hidden>
              <span class="empty-chair" aria-hidden="true"></span>
              <p>条件に合う募集はまだありません</p>
              <a href="/create">最初の募集カードを掛ける</a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}

export function CreatePage() {
  return (
    <Layout
      appScript
      page="create"
      title="募集カードをつくる"
      path="/create"
      description="施術条件と候補日時を一枚の募集カードへまとめる。"
    >
      <Header />
      <main class="shell create-layout">
        <section class="builder-panel" aria-labelledby="create-title">
          <header class="builder-head">
            <span class="step-no">01</span>
            <div>
              <h2 id="create-title">募集カードをつくる</h2>
              <p>公開期間は最大14日。応募者情報は受け取りません。</p>
            </div>
          </header>
          <form id="call-form" class="call-form">
            <fieldset>
              <legend>募集の種類</legend>
              <div class="choice-row">
                {KINDS.map((kind, index) => (
                  <label>
                    <input type="radio" name="kind" value={kind.id} checked={index === 0} />
                    <span>{kind.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>
                施術メニュー <small>3つまで</small>
              </legend>
              <div class="tool-tray" id="menu-choices">
                {MENUS.map((menu, index) => (
                  <label data-menu={menu.id}>
                    <input type="checkbox" name="menus" value={menu.id} checked={index === 0} />
                    <span class="tool-icon" aria-hidden="true"></span>
                    <span>{menu.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div class="form-grid">
              <label>
                <span>サロン表示名</span>
                <input name="salonName" maxlength={40} autocomplete="organization" required />
              </label>
              <label>
                <span>広域エリア</span>
                <select name="area" required>
                  {AREAS.map((area) => (
                    <option value={area.id}>{area.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  最寄り駅 <small>住所は書かない</small>
                </span>
                <input name="station" maxlength={40} placeholder="例: 表参道駅" required />
              </label>
              <label>
                <span>料金</span>
                <span class="price-input">
                  <input
                    name="price"
                    type="number"
                    min={0}
                    max={8000}
                    step={100}
                    value={0}
                    required
                  />
                  <span>円</span>
                </span>
              </label>
              <label>
                <span>対象レングス</span>
                <select name="hair">
                  {HAIR_LENGTHS.map((hair) => (
                    <option value={hair.id}>{hair.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>連絡先URL</span>
                <input
                  name="contactUrl"
                  type="url"
                  maxlength={240}
                  placeholder="Instagram / LINE / X"
                  required
                />
              </label>
            </div>

            <fieldset class="slot-fieldset">
              <legend>
                候補日時 <small>1〜5件</small>
              </legend>
              <div class="slot-inputs" id="slot-inputs">
                {[0, 1, 2, 3, 4].map((index) => (
                  <label hidden={index > 1}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <input type="datetime-local" name="slots" />
                  </label>
                ))}
              </div>
              <button type="button" class="add-slot" id="add-slot">
                候補日時を追加
              </button>
            </fieldset>

            <label class="note-field">
              <span>
                髪の条件・補足 <small>160文字まで</small>
              </span>
              <textarea
                name="note"
                maxlength={160}
                rows={3}
                placeholder="例: 鎖骨より長い方。ブリーチ履歴をDMで教えてください。"
              ></textarea>
            </label>

            <label class="confirm-check">
              <input type="checkbox" name="confirmed" required />
              <span>
                自分が管理する募集です。正確な住所、電話番号、メール、顔写真、前払い案内は掲載しません。
              </span>
            </label>
            <p class="form-error" id="form-error" role="alert" hidden></p>
            <button class="publish-call" type="submit">
              募集カードを公開
            </button>
          </form>
        </section>

        <aside class="preview-panel" aria-labelledby="preview-title">
          <header>
            <span class="step-no">02</span>
            <h2 id="preview-title">カード見本</h2>
          </header>
          <ChairStage />
          <article class="call-card preview-card">
            <div class="card-topline">
              <span id="preview-kind">練習モデル</span>
              <span>14日</span>
            </div>
            <h3 id="preview-salon">サロン表示名</h3>
            <p class="card-station" id="preview-station">
              都心 · 最寄り駅
            </p>
            <div class="card-menus" id="preview-menus">
              <span>カット</span>
            </div>
            <div class="card-price" id="preview-price">
              ¥0
            </div>
            <div class="slot-rail" id="preview-slots">
              <span>候補日時がここに並びます</span>
            </div>
          </article>
        </aside>
      </main>
      <Footer />
    </Layout>
  );
}

function formattedSlot(slot: string): string {
  const date = new Date(`${slot}:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function CallPage({ listing }: { listing: PublicListing }) {
  const price = listing.price === 0 ? "無料" : `¥${listing.price.toLocaleString("ja-JP")}`;
  return (
    <Layout
      appScript
      page="call"
      title={`${listing.salonName}の${kindLabel.get(listing.kind)}`}
      path={`/calls/${listing.id}`}
      description={`${listing.station}で${listing.menus.map((menu) => menuLabel.get(menu)).join("・")}モデルを募集。`}
    >
      <Header />
      <main class="shell detail-layout" data-listing-id={listing.id}>
        <section class="detail-chair">
          <ChairStage />
          <div class="detail-label">
            <span>{kindLabel.get(listing.kind)}</span>
            <strong>{price}</strong>
          </div>
        </section>
        <article
          class="detail-ticket"
          data-contact-url={listing.contactUrl}
          data-salon-name={listing.salonName}
        >
          <header>
            <span>{areaLabel.get(listing.area)}</span>
            <span>{listing.station}</span>
          </header>
          <h2>{listing.salonName}</h2>
          <div class="detail-menus">
            {listing.menus.map((menu) => (
              <span>{menuLabel.get(menu)}</span>
            ))}
          </div>
          <dl class="condition-grid">
            <div>
              <dt>料金</dt>
              <dd>{price}</dd>
            </div>
            <div>
              <dt>レングス</dt>
              <dd>{hairLabel.get(listing.hair)}</dd>
            </div>
          </dl>
          {listing.note ? <p class="detail-note">{listing.note}</p> : null}
          <fieldset class="slot-picker" id="slot-picker">
            <legend>連絡する候補日時を選ぶ</legend>
            {listing.slots.map((slot, index) => (
              <label>
                <input type="radio" name="chosen-slot" value={slot} checked={index === 0} />
                <span>{formattedSlot(slot)}</span>
              </label>
            ))}
          </fieldset>
          <div class="application-slip">
            <span>応募文</span>
            <p id="application-message"></p>
            <button type="button" id="copy-message">
              応募文をコピー
            </button>
            <a
              id="open-contact"
              href={listing.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              連絡先を開く
            </a>
          </div>
          <p class="contact-warning">
            連絡前にサロンの実在、施術内容、料金を確認してください。前払い・本人確認書類の送付は行わないでください。
          </p>
          <details class="report-box">
            <summary>この募集を報告</summary>
            <div id="report-actions">
              <button type="button" data-reason="unsafe_link">
                危険なリンク
              </button>
              <button type="button" data-reason="inaccurate">
                内容が不正確
              </button>
              <button type="button" data-reason="expired">
                募集終了
              </button>
              <button type="button" data-reason="personal_data">
                個人情報
              </button>
            </div>
            <p id="report-status" role="status"></p>
          </details>
        </article>
      </main>
      <Footer />
    </Layout>
  );
}

export function ManagePage({ id }: { id: string }) {
  return (
    <Layout appScript page="manage" title="募集カード管理" path={`/manage/${id}`} noIndex>
      <Header />
      <main class="shell manage-layout" data-listing-id={id}>
        <section class="manage-ticket">
          <span class="manage-key" aria-hidden="true"></span>
          <div>
            <h2>募集カード管理</h2>
            <p id="manage-status">管理鍵を確認しています</p>
          </div>
          <div class="manage-actions" id="manage-actions" hidden>
            <button type="button" id="copy-call-url">
              公開URLをコピー
            </button>
            <a id="view-call" href={`/calls/${id}`}>
              公開カードを見る
            </a>
            <button type="button" class="close-call" id="close-call">
              募集を終了
            </button>
          </div>
        </section>
        <aside class="manage-note">
          <ChairStage />
          <p>
            このページのURLに管理鍵が入っています。公開せず、同じ端末のブックマークへ保存してください。
          </p>
        </aside>
      </main>
      <Footer />
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout title="使い方" path="/guide">
      <Header />
      <main class="legal-page">
        <h2>使い方</h2>
        <ol>
          <li>施術者が、広域エリア、駅、メニュー、料金、候補日時を募集カードにします。</li>
          <li>希望者が一覧で条件を絞り、カード上で候補日時を選びます。</li>
          <li>端末内で作った応募文をコピーし、掲載者のLINE・Instagram・Xへ進みます。</li>
        </ol>
        <h3>掲載できないもの</h3>
        <p>
          正確な住所、電話番号、メールアドレス、顔写真、前払い案内、許可していない外部URLは掲載できません。応募者の情報とメッセージはChair
          Callへ送信されません。
        </p>
        <h3>安全に使う</h3>
        <p>
          連絡先のプロフィールとサロンの実在を確認し、施術内容、料金、所要時間、撮影時の写真利用範囲を事前に合意してください。
        </p>
      </main>
      <Footer />
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title="プライバシー" path="/privacy">
      <Header />
      <main class="legal-page">
        <h2>プライバシー</h2>
        <h3>公開して保存するもの</h3>
        <p>
          掲載者が入力したサロン表示名、広域エリア、最寄り駅、施術条件、候補日時、外部連絡URLを公開します。募集は最大14日で終了し、終了から30日後に削除します。
        </p>
        <h3>保存しないもの</h3>
        <p>
          正確な住所、電話番号、メール、顔写真、応募者プロフィール、選んだ日時、応募文、外部SNSでのやり取り、決済情報は保存しません。応募文は端末内だけで組み立てます。
        </p>
        <h3>集計するもの</h3>
        <p>
          訪問、掲載、応募文コピー、外部連絡先を開いた回数、別日再訪だけを集計します。ランダムな端末IDは受信時にSHA-256でハッシュ化し、35日後に削除します。
        </p>
        <h3>連絡先</h3>
        <p>
          <a href={`${PRODUCT.repository}/issues`}>GitHub Issues</a>
        </p>
      </main>
      <Footer />
    </Layout>
  );
}

export function NotFoundPage({
  message = "この募集カードは見つかりません。",
}: {
  message?: string;
}) {
  return (
    <Layout title="ページが見つかりません" noIndex>
      <Header />
      <main class="not-found shell">
        <span class="empty-chair" aria-hidden="true"></span>
        <h2>404</h2>
        <p>{message}</p>
        <a href="/">募集ボードへ戻る</a>
      </main>
      <Footer />
    </Layout>
  );
}
