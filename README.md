# CANNABIS iPhone版（Firebase Googleログイン導入段階）

この版は、既存のCANNABIS v0.1の画面・配色・機能をできるだけ維持し、Googleログインと社員許可リスト確認、iPhoneホーム画面アイコンを追加したものです。

## 重要：この段階でできること／まだできないこと

- Googleアカウントでログイン
- Firestore `employees/{UID}` に登録された有効社員だけがアプリ画面へ進める
- iPhoneのホーム画面に追加したときの専用アイコンとアプリ風表示
- **案件・顧客・予定などの業務データは、まだFirestore共有化していません。現在は従来どおり端末内のlocalStorage保存です。端末間共有は次段階です。**
- 既存のデモデータはサンプルです。実データを入力しないでください。

## 1. Firebaseの認証ドメインを追加

Firebase Console → Authentication → Settings（設定）→ Authorized domains（承認済みドメイン）に、次を追加します。

`h-kitade38.github.io`

URL全体や `/Cannabis/` は入力しません。

## 2. Firestoreルールを設定

Firebase Console → Firestore Database → Rules を開き、このフォルダの `firestore.rules.txt` の内容を貼り付けて公開します。

この初期ルールは、社員自身の社員ドキュメントの読み取りだけを許可し、社員ドキュメントの一覧取得・作成・変更・削除はクライアントから禁止します。社員登録はFirebase Consoleから管理者が手動で行います。その他のFirestoreコレクションはすべて拒否されます。業務データをFirestoreへ移行する段階で、コレクション単位・役割単位のルールを追加します。

## 3. 最初の管理者を登録

1. GitHub Pagesにこのファイル一式をアップロードします。
2. iPhoneのSafariで `https://h-kitade38.github.io/Cannabis/` を開き、「Googleアカウントでログイン」を押します。
3. 最初は社員登録がないためログイン後に戻されます。画面に表示されるメールアドレスとUIDを控えます。
4. Firebase Console → Firestore Database → Data でコレクション `employees` を作成します。
5. ドキュメントIDに、画面に表示されたUIDをそのまま入力します。
6. 次のフィールドを追加します。

| フィールド | 種類 | 値 |
|---|---|---|
| email | string | ログインした自分のGoogleメールアドレス |
| name | string | アプリに表示する氏名 |
| role | string | 管理者 |
| active | boolean | true |

7. iPhoneで再度Googleログインします。登録が正しければホーム画面が表示されます。

## 4. iPhoneのホーム画面に追加

1. iPhoneのSafariでアプリURLを開く。
2. 画面下部の共有ボタンを押す。
3. 「ホーム画面に追加」を選ぶ。
4. 表示名がCANNABISになっていることを確認して追加する。

## 5. GitHub Pagesへの反映

リポジトリ `Cannabis` の既存ファイルを、このZIP内の同名ファイル・`icons` フォルダで置き換えてください。GitHub PagesのURLは変更しません。

## 無料利用について

この実装はFirebase AuthenticationとCloud Firestoreの基本機能を使います。FirebaseプロジェクトはSpark（無料）プランのままにしてください。Blazeへの変更、請求先の登録、有料機能の有効化は行わないでください。無料枠の上限に達した場合は利用を止めて確認し、承認なしに課金へ移行しないでください。

## 注意

Firebase Web設定のapiKey等はWebアプリで公開される前提の設定値です。サービスアカウント鍵やAdmin SDK秘密鍵は絶対にこのフォルダへ入れないでください。

---

## CANNABIS v0.2（STRACプロトタイプ）

この版では、既存のFirebase Googleログインとv0.1の画面構成を維持し、STRAC画面の試作を追加しています。

### STRACの計算
- PQ：売上処理が「処理済」で、売上計上月が選択月と一致する案件のPQ合計
- VQ：同じ案件のVQ合計
- MQ：PQ - VQ
- F：月ごとに手入力する固定費
- G：MQ - F
- Fは年間固定費予定額を12で割った月額を入力します。
- 月を切り替えると、その月の案件データとFを表示します。過去月のデータは削除せず保持します。
- STRAC図はSVGで描画し、PQ・VQ・MQ・F・Gの値に応じて形状を変えます。Gがマイナスの場合、Fの領域がMQの基準線より下へ突出し、その突出部分にマイナスのGを表示します。
- 図中の記号はPQ / VQ / MQ / F / Gに統一しています。

### 案件の数値登録
案件の編集・新規登録に「売上計上月」「PQ」「VQ」「売上処理」を追加しています。売上処理を「処理済」にし、売上計上月を設定した案件がSTRACの月次集計対象になります。

### 現時点の制約
- 案件・STRACのデータ保存はブラウザのlocalStorageです。Firebaseログインは有効ですが、案件・固定費・STRAC数値は複数端末間で同期されません。
- この版はSTRAC機能のプロトタイプです。請求・入金処理や完全な案件進捗ボード、勤怠連動、ガントチャートはまだ実装していません。
- 既存のlocalStorageデータは同じブラウザ内で継続利用できます。新しい項目は初期値を補完します。


## v0.3 STRAC修正版

- STRACは「メニュー → STRAC」から開きます。
- 案件に入力したPQ・VQは、売上計上月に応じてSTRACへ即時集計します（売上処理フラグの有無では集計を止めません）。
- 新規案件の売上計上月は当月を初期値にします。既存案件で売上計上月が空欄かつPQ/VQが入力済みの場合は、当月表示時に限り集計対象として扱います。
- FはSTRAC画面から編集せず、「メニュー → 設定」で年度ごとの年間固定費を登録します。月次Fは年間固定費÷12です。
- STRAC図は提示されたレイアウト（PQ列、VQ上段、MQ下段左、F/G下段右）を基準に描画し、赤字時はFの領域が基準線より下へ突出してGマイナスを表示します。
- 図中の表記はPQ / VQ / MQ / F / Gに統一しています。

※このバージョンも業務データの保存先は端末内localStorageです。複数端末・複数社員間の同期はまだ実装していません。

---

## v0.4 Phase 1 update (2026-11-21)

### Implemented
- Project flow board with three columns: ①材料 / ②仕掛品 / ③商品.
- New projects enter ①材料. A project can move to ②仕掛品 after estimate approval.
- ②仕掛品 requires all three preparation checks (application documents, schedule coordination, staffing coordination) before moving to ③商品.
- Projects marked work-completed and sales-processed leave the active board but remain stored in local data.
- Schedule has three views: daily list, employee-row timeline (default), and monthly calendar.
- Schedule records now include start and end times. Times beyond midnight can be entered as 25:00, 26:00, etc.; the work date remains the start date.
- Dashboard shows today's schedule as one row per record.
- Timeline shows employees vertically and time horizontally from 08:00 to 30:00. Presence highlight is currently a local prototype toggle, not yet connected to attendance records.
- STRAC monetary values and percentages are rounded to integers; no decimal places are displayed. Negative G remains negative and extends below the baseline.

### Not implemented yet / limitations
- Project, schedule, attendance, and STRAC business data are still stored in browser localStorage. They are not shared across devices or employees.
- Employee rows are currently inferred from the logged-in user and names appearing in schedule records. There is not yet a full employee master or internal/field staff classification.
- Presence highlight is manually toggled for prototype testing; it is not actual attendance integration.
- Role and page-level permission management remains deferred as requested.
- No production readiness claim: test with sample data before using for real operations.

## v0.5 スケジュール・ホーム画面改訂

- 予定の開始・終了時刻は4桁入力（例：0700、1900、2600）。保存時は従来互換の `HH:MM` 形式で保持。
- ガントチャートは通常08:00〜18:00。対象日の予定に08:00より前、または18:00より後があれば表示範囲を自動拡張。
- ホーム画面の順序を「今日の予定 → 案件の流れ（材料・仕掛品・商品）→ 会社の数字（STRAC）」に変更。
- 下部ナビゲーションを「ホーム・案件・予定・勤怠・メニュー」に変更。
- 勤怠ページ自体は現段階では次段階の実装対象。
