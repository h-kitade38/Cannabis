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
