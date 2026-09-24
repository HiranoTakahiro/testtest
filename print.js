var ePosDev = new epson.ePOSDevice();
var printer = null;
var printerAddress = "";
var printerPort = 8043;

var isConnected = false; //プリンター接続されているか
var isPrinting = false; //印刷中か

var cardNumber = "-"; //交通系ICカードのID番号,またはクレジットカードの番号. 印刷表記
var effectiveStartDate = "-"; //期限開始日. 印刷表記
var effectiveEndDate = "-"; //期限終了日. 印刷表記


/**
 * printerAddressのセッター
 */
function setPrinterAddress(address) {
    printerAddress = address;
}

/**
 * printerPortのセッター
 */
function setPrinterPort(port) {
    if (port !== 8008 && port !== 8043) {
        throw new Error(`ポートは 8008 または 8043 を指定してください: ${port}`);
    }
    printerPort = port;
}

/**
 * effectiveStartDateのセッター
 */
function setEffectiveStartDate(day) {
    effectiveStartDate = formatDate(day);
}

/**
 * effectiveEndDateのセッター
 */
function setEffectiveEndDate(day) {
    effectiveEndDate = formatDate(day);
}

/**
 * cardNumberのセッター
 * それぞれのカードのフォーマットの表記に変換して格納
 */
function setCardNumber(value){
    cardNumber = "-";
    if (/^[a-zA-Z]/.test(value)) { // 1文字目が英字のときの処理
        cardNumber = formatIcCardNumber(value);
    } else {
        // スペースとハイフンを除去してから数字のみかチェック
        const digits = value.replace(/[\s-]/g, '');
        if (!/^\d+$/.test(digits)) {
            throw new Error(`カード番号は数字で入力してください: ${value}`);
        }
        cardNumber = maskCardNumber(value);
    }
}



/**
 * ハイフン付きの日付データをスラッシュ付きの日付に変換
 *　2026-09-29 -> 2026/9/29
 * @param {*} str yyyy-mm-dd 
 * @returns yyyy/mm/dd
 */
function formatDate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) throw new Error(`不正な日付形式です: ${str}`);
    return `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}`;
}



/**
 * ICカードのID番号を「XXXXX XXXX XXXX XXXX」の表記へと変える
 */
function formatIcCardNumber(str) {
    if (typeof str !== 'string' || str.length !== 17) {
        throw new Error(`17文字で指定してください: ${str}`);
    }
    return str.replace(/^(.{5})(.{4})(.{4})(.{4})$/, '$1 $2 $3 $4');
}



const CARD_PATTERNS = {
    14: [4, 6, 4],      // Diners Club
    15: [4, 6, 5],      // American Express
    16: [4, 4, 4, 4],   // Visa / Mastercard / JCB など
};

function splitBy(str, sizes) {
    let i = 0;
    return sizes.map(n => str.slice(i, i += n));
}

function getSizes(str) {
    if (typeof str !== 'string') {
        throw new TypeError('文字列で指定してください');
    }
    const sizes = CARD_PATTERNS[str.length];
    if (!sizes) {
        throw new Error(`対応外の桁数です: ${str.length}桁`);
    }
    return sizes;
}

/**
 * クレジットカードの表記を変える
 * 最後のブロック以外をアスタリスクでマスクする
 */
function maskCardNumber(str, sep = ' ', maskChar = '*') {
    const chunks = splitBy(str, getSizes(str));
    const last = chunks.length - 1;
    return chunks
        .map((chunk, idx) => (idx === last ? chunk : maskChar.repeat(chunk.length)))
        .join(sep);
}



/**
 * プリンターを接続させる
 */
function connectPrinter() {    
    console.log("1.connectPrinter開始");

    ePosDev.connect(
        printerAddress,
        printerPort,
        function (result) {
            console.log("2.connect結果: " + result);
            alert("connect結果: " + result);

            if (result !== "OK" && result !== "SSL_CONNECT_OK") {
                console.log("接続失敗");
                return;
            }

            isConnected = true;
            console.log("3.ePOS Device接続成功");

            ePosDev.createDevice(
                "local_printer",
                ePosDev.DEVICE_TYPE_PRINTER,
                {},
                function (device, code) {
                    if (device) {
                        printer = device;
                        setupPrinterEvents(printer)
                        console.log("4.プリンター作成成功");
                    } else {
                        console.log("4.プリンター作成失敗: " + code);
                    }
                }
            );
        }
    );
}

function setupPrinterEvents(printer) {
    printer.onreceive = function (response) {
        isPrinting = false;
        if (response.success) {
            resetPrintData();
            console.log('印刷完了');
        } else {
            console.log('印刷失敗: ' + response.code);
        }
    };

    printer.onerror = function (error) {
        isPrinting = false;
        console.log('通信エラー: ' + error.status);
    };
}

/**
 * 印刷が終わったら値を初期状態に戻す関数
 */
function resetPrintData() {
    cardNumber = "-";
    effectiveStartDate = "-";
    effectiveEndDate = "-";
}

/**
 * 印刷を行う
 */
function printDiscountReceipt() {
    if (!isConnected || printer === null) {
        console.log('プリンターが準備されていません');
        return;
    }

    if (isPrinting) {
        console.log('印刷中です');
        return;
    }

    isPrinting = true;
    const separator = '= '.repeat(20).trim() + '\n';

    try {
        printer.addTextLang('ja');
        printer.addTextSmooth(true);
        printer.addTextAlign(printer.ALIGN_CENTER);
        // printer.addFeedLine(3);
        // printer.addText('割引情報控え\n');
        // printer.addText(separator);
        // printer.addText('市民割引運賃\n');
        printer.addText(cardNumber + '\n');
        printer.addText(separator);
        printer.addText('有効期限：' + effectiveStartDate  + '　～　' + effectiveEndDate + '\n');
        // printer.addFeedLine(6);
        printer.addCut(printer.CUT_FEED);
        printer.send();
    } catch (e) {
        // send まで到達しなかった場合はフラグを戻す
        isPrinting = false;
        console.log('印刷データ作成エラー: ' + e.message);
    }
}