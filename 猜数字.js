// JavaScript Document
class TakeaGuess {
    constructor() {
        this.scoreTip = document.getElementById('scoreTip');
        this.ins = document.getElementById('ins');
        this.btnSubmit = document.getElementById('btnSubmit');
        this.friendlyReminder = document.getElementById('friendlyReminder');
        this.gameResult = document.getElementById('gameResult');
        this.resultContainer = document.getElementById('resultContainer');
        this.gameNumber;
        this.mistake;
        this.total;
    }

	indexOfGame() {
        this.scoreTip.innerText = '';
        this.ins.value = '0';
        this.friendlyReminder.innerText = '';
        this.gameResult.innerText = '';
		this.resultContainer.className = 'item item-6';
    }
	
    initGame() {
        this.scoreTip.innerText = '游戏开始啦~\n猜猜我想的数字是？';
        this.ins.value = '0';
        // this.mistake = 0;
        this.total = 10;
        this.friendlyReminder.innerText = '注意：\n是在1~100之内哦~';
        this.gameResult.innerText = '';
        this.resultContainer.className = 'item item-6';
        this.gameNumber = this.randomaNum();
        console.log(this.gameNumber);
        this.gameEvent();
    }

    // 随机生成1个100以内的数
    randomaNum() {
        return Math.floor(Math.random() * 100);
    }

    // 判断用户输入的数字大了还是小了
    judgeUserInp() {
        let val = this.ins.value;
        if (val<1){
			this.friendlyReminder.innerText = '你输入的数字比1还小了！';
		}else if (val>100){
			this.friendlyReminder.innerText = '你输入的数字比100还大了！';
		}else if(val > this.gameNumber) {
            this.moreThen();
        } else if (val < this.gameNumber) {
            this.lessThen();
        } else {
            this.equalForNum();
        }
    }

    // 用户输入数字大于随机数
    moreThen() {
        this.notEqualForNum();
        this.friendlyReminder.innerText = '大了一点哦';
    }

    // 用户输入数字小于随机数
    lessThen() {
        this.notEqualForNum();
        this.friendlyReminder.innerText = '小了一点哦';

    }

    // 用户输入数字等于随机数
    equalForNum() {
        this.total--;
        let resNum = 10 - this.total;
        this.friendlyReminder.innerText = '你答对了';
        this.scoreTip.innerText = `你还有${this.total}次机会`;
        this.winGame();
    }

    // 不等
    notEqualForNum() {
        if (this.total <= 1) {
            this.gameOver();
        }
        this.total--;
        this.friendlyReminder.innerText = '你答错了';
        this.scoreTip.innerText = `你还有${this.total}次机会`;
    }

    // 挑战失败，游戏结束
    gameOver() {
        this.resultContainer.classList.add('failure');
        this.gameResult.innerText = `很遗憾，你没有读懂我的心~\n下次加油哦~`;
        this.playAgain();
    }

    // 挑战成功，游戏结束
    winGame() {
        let resNum = 10 - this.total;
        this.resultContainer.classList.add('win');
		if (resNum<4){
			this.gameResult.innerText = `你是读心大师！\n你用了${resNum}次机会就读懂了我`;
		}
		else if(resNum<7){
			this.gameResult.innerText = `你是读心高手！\n你用了${resNum}次机会就读懂了我`;
		}
		else {
			this.gameResult.innerText = `你是读心初学者！\n你用了${resNum}次机会就读懂了我`;
		}
        this.playAgain();
    }

    // again再来一次
    playAgain() {
        setTimeout(() => {
            let val = confirm('再来一次?');
            if (val) {
                this.indexOfGame();
            }
        }, 1);
    }

    // 绑定事件
    gameEvent() {
        // 猜一猜按钮点击事件
        this.btnSubmit.onclick = () => {
            this.judgeUserInp();
        };

        this.ins.onkeydown = (event) => {
            if (event.keyCode == 13) {
                this.judgeUserInp();
            }
        }
    }
};


(() => {
    document.getElementById('begin').onclick = () => {
        var takeaGuess = new TakeaGuess();
        takeaGuess.initGame();
    }
})();