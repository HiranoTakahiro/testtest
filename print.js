var ePosDev = new epson.ePOSDevice();
var printer = null;
var isConnected = false; //プリンター接続されているか
var effectiveStartDate = "-"; //期限開始日
var effectiveEndDate = "-"; //期限終了日

/**
 * effectiveStartDateのセッター
 */
function setEffectiveStartDate(day){
    effectiveStartDate = day;
}

/**
 * effectiveEndDateのセッター
 */
function setEffectiveEndDate(day){
    effectiveEndDate = day;
}

/**
 * プリンターを接続させる
 */
function connectPrinter() {    
    console.log("1.connectPrinter開始");

    ePosDev.connect(
        //"192.168.101.10",
        "172.16.10.1",
        8043,
        function (result) {
            console.log("2.connect結果: " + result);
            alert("2.connect結果: " + result);

            if (result !== "OK" && result !== "SSL_CONNECT_OK") {
                console.log("接続失敗: " + result);
                return;
            }

            isConnected = true;
            console.log("3.ePOS Device接続成功");

            ePosDev.createDevice(
                "local_printer",
                ePosDev.DEVICE_TYPE_PRINTER,
                {},
                function (device, code) {
                    console.log("4.createDevice callback");

                    if (device) {
                        printer = device;
                        console.log("5.プリンター作成成功");
                    } else {
                        console.log("5.プリンター作成失敗: " + code);
                    }
                }
            );
        }
    );
}

/**
 * 印刷を行う
 * @param id htmlで入力されたクレジットカード番号、もしくは交通系ICカードのID番号
 * @returns 
 */
function print(id) {
    if (printer === null) {
        console.log("プリンターが準備されていません");
        return;
    }

    console.log("印刷開始")

    printer.onreceive = function (response) {
        console.log(
            "onreceive\n" +
            "success: " + response.success + "\n" +
            "code: " + response.code
        );
    };

    printer.onerror = function (error) {
        console.log(
            "error\n" +
            "status: " + error.status
        );
    };

    var inputValue = document.getElementById(id).value;

    // 上に6行分空ける
    //printer.addFeedLine(6);

    // 印刷
    printer.addTextLang("ja");
    printer.addTextSmooth(true);
    printer.addTextAlign(printer.ALIGN_CENTER);
    printer.addText("割引情報控え\n");
    // printer.addText("= = = = = = = = = = = = = = = = = = = =\n");
    // printer.addText("市民割引運賃\n");
    // printer.addText(inputValue + "\n");
    // printer.addText("= = = = = = = = = = = = = = = = = = = =\n");
    // printer.addText("有効期限：" + effectiveStartDate + "　～　" + effectiveEndDate + "\n");


    // 下に6行分空ける
    //printer.addFeedLine(6);

    // カット
    printer.addCut(printer.CUT_FEED);


    // 送信
    printer.send();
}



connectPrinter();