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


## v0.6 ホーム画面・iPhone表示調整

- iOSホーム画面アプリ表示時の上部セーフエリアを確保し、時計・電波・バッテリー表示とヘッダーの重なりを防止。
- ヘッダー右側のホームボタンを削除（下部ナビのホームを使用）。
- アプリ名を2段表示にし、CANNABISの下に「カナビス」を追加。
- ホームの案件進捗セクション名を「会社盤」に変更。
- 会社盤の3枠を縦長にし、各枠の件数を大きく表示。案件詳細は最大2件、残りは「ほか n 件」と表示。
- 下部ナビのホームボタンは維持。


## v0.7 改訂内容
- ログイン画面の重複案内文を削除（エラー時の案内表示領域は維持）
- 提供されたアイコン画像をアプリアイコン（192/512px・Apple touch icon）に反映
- 案件ページに「会社盤／全案件一覧」の切替を追加。完了・売上処理済み案件も一覧から参照可能
- スケジュールに「全体」行、予定削除、終日予定、予定分類色、案件との任意リンクを追加
- ガントチャートで同一社員の時間重複予定を別レーンに表示
- 月間カレンダーに予定名を表示
- 1日一覧の予定カードをコンパクト化

※現行データは引き続きブラウザのlocalStorage保存です。端末間共有は未実装です。
※iPhone実機での表示・操作確認は必要です。


## v0.9 スケジュール表示の改訂

- ガントチャートの社員名横にあった勤務状態の手動切替ボタンを削除しました。勤務状態表示の色分けは残していますが、勤怠との自動連携は未実装です。
- 終日予定は固定で09:00〜18:00として保存・表示します。終日選択時は時刻入力不要です。
- 月間表示は日付ごとの縦リストに変更し、予定名・担当者・場所・時間を省略せず表示します。
- 1日一覧の予定カード、余白、編集・削除操作をコンパクトにしました。


## v1.0 勤怠機能（端末内プロトタイプ）

### 追加した機能
- ログイン中のGoogleアカウントに紐づけて、本人が出勤・退勤を記録します。記録時刻は端末の現在時刻を保存します。
- 休憩時間の入力・控除はありません。
- 勤務日は出勤日を基準に保持します。翌日02:00の退勤は、勤務日からの経過時間として26:00表記で表示します。
- 有給・代休の取得日を登録できます。残日数は「設定」から登録・編集し、取得登録時に1日差し引きます。
- 本人の勤怠記録を訂正できます。訂正前の値・訂正日時・訂正者UIDを監査履歴として保持します。
- ガントチャートでは、選択日の本人の出勤中記録がある場合に本人を「勤務中」表示にします。その他の社員は勤務状態を確認できないため勤務中表示にしません。

### 重要な制約
- **この版でも案件・予定・勤怠・休暇残日数などの業務データはブラウザのlocalStorage保存です。Firestoreへの業務データ保存・同期は未実装です。**
- 各社員が自分のiPhoneで出退勤を打刻しても、他の社員の端末や管理者端末には共有されません。現状は打刻した端末内だけに記録されます。
- ガントチャートの勤務状態も、同じ端末に保存されたログイン本人の勤怠記録だけを参照します。全社員の勤務状態をリアルタイムに反映するにはFirestore共有化が必要です。
- 休暇残日数の設定は現時点ではログイン本人が編集できます。管理者限定の権限設定は未実装です。
- 勤怠訂正の監査履歴はデータとして保存しますが、監査履歴専用画面は未実装です。
- 有給・代休の承認フローは追加していません。本人による取得記録方式です。
- データはブラウザのサイトデータ削除等で消える可能性があります。実運用前に必ずテストし、バックアップ手段を用意してください。

### Firebase・料金
- Firebase AuthenticationによるGoogleログインと、社員ドキュメント確認のみを使用します。
- Firestoreへの業務データ書き込みは追加していません。Firebase Spark（無料）プランのまま利用してください。Blazeへの変更や請求先登録は行わないでください。

## v1.1 修正内容（2026-11-22）

- 商品列のチェック項目を「作業完了」と「売上処理」に分離。片方だけでは案件盤から除外せず、両方完了した場合にアーカイブ。
- 有給は管理者ロールのみ設定画面から残日数を変更可能。本人は「有給を取得」で残日数を使用。
- 代休は本人が「代休を登録」で残日数を加算し、「代休を取得」で使用。
- 休暇取得は0.5日単位で登録可能。
- 勤怠履歴から記録の種類・日付・時刻・日数・備考を変更可能。勤務記録を有給／代休取得へ変更すると残日数も調整。
- 勤怠履歴の削除に対応。休暇取得の削除時は残日数を戻し、削除した記録本体は `attendanceDeleted` に削除日時・削除者とともに保持。
- 保存先は引き続きブラウザのlocalStorage。Firestoreへの業務データ同期は未実装。

### 検証範囲

- `node --check app.js` によるJavaScript構文チェック済み。
- iPhone実機・ブラウザでの操作テスト、およびFirebase/Firestore共有テストは未実施。
