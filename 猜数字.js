// JavaScript Document
class TakeaGuess {
    constructor() {
        this.scoreTip = document.getElementById('scoreTip');
        this.int = document.getElementById('int');
        this.btnSubmit = document.getElementById('btnSubmit');
        this.friendlyReminder = document.getElementById('friendlyReminder');
        this.gameResult = document.getElementById('gameResult');
        this.resultContainer = document.getElementById('resultContainer');
        this.gameNumber;
        this.total;
    }

	indexOfGame() {
        this.scoreTip.innerText = '';
        this.int.value = '0';
		this.total = 10;
        this.friendlyReminder.innerText = '';
        this.gameResult.innerText = '';
		this.resultContainer.className = 'item item-6';
    }
	
    initGame() {
        this.scoreTip.innerText = '游戏开始啦~\n猜猜我想的数字是？';
        this.int.value = '0';
		this.total = 10;
        this.friendlyReminder.innerText = '注意：\n是在1~100之内哦~';
        this.gameResult.innerText = '';
        this.resultContainer.className = 'item item-6';
        this.gameNumber = this.randomaNum();
        console.log(this.gameNumber);
        this.gameEvent();
    }

    randomaNum() {
        return Math.floor(Math.random() * 100);
    }

    judgeUserInp() {
        let val = this.int.value;
        if (val<1){
			this.friendlyReminder.innerText = '你输的数比1还小！';
		}else if (val>100){
			this.friendlyReminder.innerText = '你输的数比100还大！';
		}else if(val > this.gameNumber) {
            this.moreThen();
        } else if (val < this.gameNumber) {
            this.lessThen();
        } else {
            this.equalForNum();
        }
    }

    moreThen() {
        this.notEqualForNum();
        this.friendlyReminder.innerText = '大了一点哦';
    }

    lessThen() {
        this.notEqualForNum();
        this.friendlyReminder.innerText = '小了一点哦';

    }

    equalForNum() {
        this.total--;
        let resNum = 10 - this.total;
        this.friendlyReminder.innerText = '你答对了';
        this.scoreTip.innerText = `你还有${this.total}次机会`;
        this.winGame();
    }

    notEqualForNum() {
        if (this.total <= 1) {
            this.gameOver();
        }
        this.total--;
        this.friendlyReminder.innerText = '你答错了';
        this.scoreTip.innerText = `你还有${this.total}次机会`;
    }

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
			this.gameResult.innerText = `你是读心大师！\n你只用了${resNum}次机会就读懂了我`;
		}
		else if(resNum<7){
			this.gameResult.innerText = `你是读心高手！\n你用了${resNum}次机会就读懂了我`;
		}
		else {
			this.gameResult.innerText = `你是读心初学者！\n你用了${resNum}次机会读懂了我`;
		}
        this.playAgain();
    }

    playAgain() {
        setTimeout(() => {
            let val = confirm('再来一次?');
            if (val) {
                this.indexOfGame();
            }
        }, 1);
    }

    gameEvent() {
        this.btnSubmit.onclick = () => {
            this.judgeUserInp();
        };

        this.int.onkeydown = (event) => {
            if (event.keyCode == 13) {
                this.judgeUserInp();
            }
        }
    }
};
document.getElementById('begin').onclick = () => {
        var takeaGuess = new TakeaGuess();
        takeaGuess.initGame();
}