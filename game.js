class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 560;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.maxLevel = 5;
        this.combo = 0;
        this.gameOver = false;
        this.difficulty = 'medium';
        this.theme = 'default';
        this.timeLeft = 60;
        this.isTimeChallenge = false;
        this.ballMoving = true;
        this.mouseX = 0;
        
        // 新增生命獎勵相關設定
        this.scoreForLifeBonus = 500;
        this.lastLifeBonusScore = 0;
        this.maxLives = 10; // 設定最大生命數
        
        // 設定不同難度的球速
        this.ballSpeeds = {
            easy: 3,
            medium: 5,
            hard: 7
        };

        // 設定不同難度的隱藏磚塊出現機率
        this.hiddenBrickChances = {
            easy: 0,
            medium: 0.05,  // 5% 機率
            hard: 0.1      // 10% 機率
        };
        
        // 時間挑戰相關設定
        this.baseTime = 60;
        this.timeBonus = 10;
        this.scoreForTimeBonus = 200;
        this.lastBonusScore = 0;
        
        this.ballTrail = [];
        this.maxTrailLength = 5;
        this.highScore = localStorage.getItem('breakoutHighScore') || 0;
        this.revealedHiddenBricks = new Set();
        // 修改存檔相關變量
        this.saveKey = 'breakoutGameSave';
        this.loadProgress(); // 在構造函數中加載進度
        this.initializeGame();
    }
    // 新增生命獎勵檢查函數
    checkLifeBonus() {
        if (this.score - this.lastLifeBonusScore >= this.scoreForLifeBonus && this.lives < this.maxLives) {
            this.lives++;
            this.lastLifeBonusScore = this.score;
            document.getElementById('lives').textContent = this.lives;
            this.showBonusMessage('+ 1 ❤️');
        }
    }
    
    initializeGame() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 560;   

        this.paddle = {
            width: 100,
            height: 10,
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height - 20
        };
        
        this.ball = {
            radius: 8,
            x: this.canvas.width / 2,
            y: this.canvas.height - 30,
            dx: 4,
            dy: -4
        };
        
        this.bricks = [];
        this.setupEventListeners();
    }
    
    setTheme(theme) {
        this.theme = theme;
        const container = document.querySelector('.game-container');
        container.classList.remove('theme-default', 'theme-night', 'theme-forest');
        container.classList.add(`theme-${theme}`);
        
        document.getElementById("currentTheme").textContent = 
            theme === 'default' ? '預設' : theme === 'night' ? '夜空' : '森林';
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        document.getElementById("currentDifficulty").textContent = 
            difficulty === 'easy' ? '簡單' : difficulty === 'medium' ? '中等' : '困難';
    }

    createLevel(level) {
        this.bricks = [];
        const layouts = this.getLevelLayouts();
        const currentLayout = layouts[level - 1] || layouts[0];

        // 設置球速
        const ballSpeed = this.ballSpeeds[this.difficulty];
        this.ball.dx = ballSpeed * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -ballSpeed;

        // 判斷是否為偶數關卡，決定是否開啟時間挑戰
        this.isTimeChallenge = level % 2 === 0 && (this.difficulty === 'medium' || this.difficulty === 'hard');
        
        // 更新UI顯示時間挑戰
        if (this.isTimeChallenge) {
            this.timeLeft = this.baseTime;
            this.lastBonusScore = 0;
            document.getElementById('timeContainer').classList.remove('hide');
        } else {
            document.getElementById('timeContainer').classList.add('hide');
        }

        // 創建磚塊
        currentLayout.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value > 0) {
                    let strength = value;
                    if (this.difficulty === 'easy') {
                        strength = 1;
                    } else if (this.difficulty === 'medium') {
                        strength = Math.min(value, 2);
                    }

                    const brick = new Brick(
                        20 + j * ((this.canvas.width - 40) / row.length),
                        50 + i * 30,
                        ((this.canvas.width - 40) / row.length) - 4,
                        20,
                        strength
                    );
                    
                    // 根據難度決定是否生成隱藏磚塊
                    if (this.difficulty !== 'easy' && 
                        Math.random() < this.hiddenBrickChances[this.difficulty]) {
                        brick.isHidden = true;
                    }
                    
                    this.bricks.push(brick);
                }
            });
        });
    }

        
    // 保存遊戲進度
    saveProgress() {
        const progressData = {
            level: this.level,
            score: this.score,
            lives: this.lives,
            timeLeft: this.timeLeft,
            difficulty: this.difficulty,
            highScore: this.highScore,
            isTimeChallenge: this.isTimeChallenge,
            combo: this.combo,
            lastLifeBonusScore: this.lastLifeBonusScore,
            lastBonusScore: this.lastBonusScore
        };
        localStorage.setItem(this.saveKey, JSON.stringify(progressData));
    }

    // 載入遊戲進度
    loadProgress() {
        const savedProgress = localStorage.getItem(this.saveKey);
        if (savedProgress) {
            const data = JSON.parse(savedProgress);
            
            // 恢復遊戲狀態
            this.level = data.level;
            this.score = data.score;
            this.lives = data.lives;
            this.timeLeft = data.timeLeft;
            this.difficulty = data.difficulty;
            this.highScore = Number(localStorage.getItem('breakoutHighScore')) || 0;
            this.isTimeChallenge = data.isTimeChallenge;
            this.combo = data.combo;
            this.lastLifeBonusScore = data.lastLifeBonusScore;
            this.lastBonusScore = data.lastBonusScore;
            
            // 更新UI顯示
            this.updateUI();
        }
    }
    // 新增 UI 更新函數
    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('combo').textContent = this.combo;
        document.getElementById('timeLeft').textContent = Math.ceil(this.timeLeft);
        document.getElementById('highScore').textContent = this.highScore;
        
        // 更新難度顯示
        const difficultyText = {
            'easy': '簡單',
            'medium': '中等',
            'hard': '困難'
        };
        document.getElementById('currentDifficulty').textContent = difficultyText[this.difficulty];
        
        // 更新時間挑戰顯示
        if (this.isTimeChallenge) {
            document.getElementById('timeContainer').classList.remove('hide');
        } else {
            document.getElementById('timeContainer').classList.add('hide');
        }
    }
    

    getLevelLayouts() {
        const easyLayouts = [
            [[1,1,1,1,1], [1,1,1,1,1]],
            [[1,1,1,1,1], [1,0,1,0,1], [1,1,1,1,1]],
            [[1,1,1,1,1], [1,1,1,1,1], [1,0,0,0,1]],
            [[1,0,1,0,1], [1,1,1,1,1], [1,0,1,0,1]],
            [[1,1,1,1,1], [0,1,1,1,0], [1,1,1,1,1]]
        ];

        const mediumLayouts = [
            [[2,1,2,1,2,1], [1,2,1,2,1,2], [1,1,1,1,1,1]],
            [[2,2,2,2,2], [1,1,1,1,1], [2,1,2,1,2]],
            [[2,1,2,1,2,1], [1,2,1,2,1,2], [2,1,2,1,2,1]],
            [[2,2,1,1,2,2], [1,2,2,2,2,1], [2,1,1,1,1,2]],
            [[2,2,2,2,2,2], [1,2,1,1,2,1], [2,1,2,2,1,2]]
        ];

        const hardLayouts = [
            [[3,2,3,2,3,2,3], [2,3,2,3,2,3,2], [3,2,3,2,3,2,3]],
            [[3,3,3,3,3,3], [2,2,2,2,2,2], [3,3,3,3,3,3]],
            [[3,2,3,2,3,2,3], [3,3,3,3,3,3,3], [2,3,2,3,2,3,2]],
            [[3,3,2,2,2,3,3], [2,3,3,3,3,3,2], [3,2,3,3,3,2,3]],
            [[3,3,3,3,3,3,3], [3,2,3,2,3,2,3], [3,3,3,3,3,3,3]]
        ];

        switch(this.difficulty) {
            case 'easy':
                return easyLayouts;
            case 'medium':
                return mediumLayouts;
            case 'hard':
                return hardLayouts;
            default:
                return mediumLayouts;
        }
    }

    updateBallTrail() {
        this.ballTrail.unshift({ x: this.ball.x, y: this.ball.y });
        if (this.ballTrail.length > this.maxTrailLength) {
            this.ballTrail.pop();
        }
    }
    
    drawBallTrail() {
        this.ballTrail.forEach((pos, index) => {
            const alpha = (this.maxTrailLength - index) / this.maxTrailLength;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, this.ball.radius * (1 - index / this.maxTrailLength), 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 149, 221, ${alpha})`;
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    handleCollision(brick) {
        brick.strength--;
        if (brick.strength <= 0) {
            this.bricks.splice(this.bricks.indexOf(brick), 1);
        }
        this.combo++;
        this.score += 10 * (1 + Math.floor(this.combo / 3));
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('combo').textContent = this.combo;
        
        // 在處理碰撞後檢查生命獎勵
        this.checkLifeBonus();
    }

    
    showLevelComplete() {
        this.ballMoving = false;
        document.getElementById('levelScore').textContent = this.score;
        document.getElementById('levelComplete').classList.remove('hide');
    }
    
    nextLevel() {
        this.level++;
        if (this.level > this.maxLevel) {
            // 通關後顯示祝賀訊息並返回主畫面
            this.showGameComplete();
            return;
        }
        
        this.ballMoving = true;
        document.getElementById('level').textContent = this.level;
        document.getElementById('levelComplete').classList.add('hide');
        this.resetBall();
        this.combo = 0;
        this.createLevel(this.level);
        this.saveProgress(); // 保存進度
    }
    // 新增通關完成函數
    showGameComplete() {
        this.gameOver = true;
        this.updateHighScore();
        
        // 創建祝賀訊息元素
        const congratsDiv = document.createElement('div');
        congratsDiv.className = 'menu';
        congratsDiv.innerHTML = `
            <h2>恭喜通關！</h2>
            <p>你的最終得分：${this.score}</p>
            <p>最高分：${this.highScore}</p>
            <button id="backToMainBtn">返回主畫面</button>
        `;
        
        // 添加到遊戲容器
        document.querySelector('.game-container').appendChild(congratsDiv);
        
        // 綁定返回主畫面按鈕事件
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            congratsDiv.remove();
            this.resetGame();
            document.getElementById('gameScreen').classList.add('hide');
            document.getElementById('startMenu').classList.remove('hide');
        });
        
        // 清除本地存檔（因為已經通關）
        localStorage.removeItem(this.saveKey);
    }
    
    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('breakoutHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseMenu').classList.toggle('hide');
    
        if (this.isPaused) {
            this.ballMoving = false;
        } else {
            this.ballMoving = true;
            this.gameLoop(); // 確保在恢復時重新調用gameLoop()
        }
    
        // 確保球速維持原先設定
        this.ball.dx = this.ballSpeeds[this.difficulty] * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -this.ballSpeeds[this.difficulty];
    }

    update() {
        if (this.gameOver || !this.ballMoving) return;
        if (this.isPaused) return;

        // 更新球的位置
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        this.updateBallTrail();

        // 時間挑戰模式的時間更新
        if (this.isTimeChallenge) {
            this.timeLeft -= 1/60; // 假設遊戲以60FPS運行
            document.getElementById('timeLeft').textContent = Math.ceil(this.timeLeft);

            // 檢查時間獎勵
            if (this.score - this.lastBonusScore >= this.scoreForTimeBonus) {
                this.addTimeBonus();
            }

            // 時間用完遊戲結束
            if (this.timeLeft <= 0) {
                this.lives = 0;
                this.gameOver = true;
                this.updateHighScore();
                this.showGameOver();
                return;
            }
        }

        // 檢查隱藏磚塊
        this.checkHiddenBricks();

        if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > this.canvas.width) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }

        if (this.ball.y + this.ball.radius > this.paddle.y && 
            this.ball.x > this.paddle.x && 
            this.ball.x < this.paddle.x + this.paddle.width &&
            this.ball.y < this.paddle.y + this.paddle.height) {
            const hitPoint = (this.ball.x - this.paddle.x) / this.paddle.width;
            this.ball.dx = 8 * (hitPoint - 0.5);
            this.ball.dy = -Math.abs(this.ball.dy);
        }

        for (let i = this.bricks.length - 1; i >= 0; i--) {
            const brick = this.bricks[i];
            if (!brick.isHidden && this.checkCollision(brick)) {
                this.handleCollision(brick);
                this.ball.dy = -this.ball.dy;

                if (this.bricks.length === 0) {
                    this.showLevelComplete();
                    return;
                }
                break;
            }
        }

        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.lives--;
            document.getElementById('lives').textContent = this.lives;
            
            if (this.lives <= 0) {
                this.gameOver = true;
                this.updateHighScore();
                this.showGameOver();
                localStorage.removeItem(this.saveKey); // 遊戲結束時清除存檔
                return;
            }
            
            this.resetBall();
            this.combo = 0;
            document.getElementById('combo').textContent = this.combo;
            this.saveProgress(); // 球掉落時保存進度
        }
    }
    addTimeBonus() {
        this.timeLeft += this.timeBonus;
        this.lastBonusScore = this.score;
        
        // 顯示獎勵提示
        this.showBonusMessage(`+${this.timeBonus}秒!`);
    }
    showBonusMessage(message) {
        const bonusDiv = document.createElement('div');
        bonusDiv.textContent = message;
        bonusDiv.style.position = 'absolute';
        bonusDiv.style.left = '50%';
        bonusDiv.style.top = '50%';
        bonusDiv.style.transform = 'translate(-50%, -50%)';
        bonusDiv.style.color = '#FF6B9C';
        bonusDiv.style.fontSize = '24px';
        bonusDiv.style.fontWeight = 'bold';
        bonusDiv.style.animation = 'fadeOut 1s forwards';
        document.querySelector('.game-container').appendChild(bonusDiv);
        
        setTimeout(() => bonusDiv.remove(), 1000);
    }

    checkHiddenBricks() {
        // 檢查球是否接近隱藏磚塊
        this.bricks.forEach(brick => {
            if (brick.isHidden) {
                const distance = Math.sqrt(
                    Math.pow(this.ball.x - (brick.x + brick.width/2), 2) +
                    Math.pow(this.ball.y - (brick.y + brick.height/2), 2)
                );
                
                if (distance < 100) { // 如果球靠近隱藏磚塊100像素範圍內
                    brick.isHidden = false;
                    this.revealedHiddenBricks.add(brick);
                }
            }
        });
    }
    resetBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.canvas.height - 30;
        
        // 根據難度設置固定的球速
        const speed = this.ballSpeeds[this.difficulty];
        this.ball.dx = speed * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -speed;
        
        this.ballTrail = [];
        
        // 每次重置球時保存進度
        this.saveProgress();
    }

    showGameOver() {
        document.getElementById('gameScreen').classList.add('hide');
        document.getElementById('gameOverMenu').classList.remove('hide');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBallTrail();

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0095DD';
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.fillStyle = '#0095DD';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

        this.bricks.forEach(brick => {
            if (!brick.isHidden) {
                brick.draw(this.ctx);
            }
        });
    }

    checkCollision(brick) {
        const ballLeft = this.ball.x - this.ball.radius;
        const ballRight = this.ball.x + this.ball.radius;
        const ballTop = this.ball.y - this.ball.radius;
        const ballBottom = this.ball.y + this.ball.radius;
        
        return ballRight > brick.x && ballLeft < brick.x + brick.width && 
               ballBottom > brick.y && ballTop < brick.y + brick.height;
    }

    setupEventListeners() {
        // 修改為使用 document 層級的事件監聽
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const relativeX = (e.clientX - rect.left) * scaleX;
            
            this.paddle.x = Math.min(
                Math.max(relativeX - this.paddle.width / 2, 0),
                this.canvas.width - this.paddle.width
            );
        });

        mainMenuButton.addEventListener('click', () => {
            this.isPaused = true;
            this.ballMoving = false;
            document.getElementById('startMenu').classList.remove('hide');
            document.getElementById('gameScreen').classList.add('hide');
            document.getElementById('pauseMenu').classList.add('hide');
            
            // 清除遊戲畫面
            this.clearGameScreen();
            
            this.resetGame();
            cancelAnimationFrame(this.gameLoopId);
        });

        document.querySelectorAll('.theme-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.setTheme(button.dataset.theme);
            });
        });

        document.querySelectorAll('.difficulty-select button').forEach(button => {
            button.addEventListener('click', () => {
                this.setDifficulty(button.dataset.difficulty);
                document.getElementById('startButton').classList.remove('hide');
            });
        });

        document.getElementById('nextLevelButton').addEventListener('click', () => {
            this.nextLevel();
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            document.getElementById('gameOverMenu').classList.add('hide');
            document.getElementById('startMenu').classList.remove('hide');
            this.resetGame();
        });
        document.getElementById('startButton').addEventListener('click', () => {
            document.getElementById('startMenu').classList.add('hide');
            document.getElementById('gameScreen').classList.remove('hide');
            this.startGame();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
            }
        });
    
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.togglePause();
        });
    
        document.getElementById('restartLevelButton').addEventListener('click', () => {
            this.togglePause();
            this.createLevel(this.level);
            this.resetBall();
        });

    }
    clearGameScreen() {
        // 清除畫布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 重置所有遊戲相關的數組和變量
        this.bricks = [];
        this.ballTrail = [];
        
        // 重置球和板子的位置
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 30;
        this.paddle.x = this.canvas.width / 2 - this.paddle.width / 2;
        
        // 立即重繪一次以確保畫面被清除
        this.draw();
    }
    startGame() {
        this.resetGame();
        this.createLevel(this.level);
        this.gameLoop();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.gameOver = false;
        this.timeLeft = 60;
        this.isPaused = false;
        this.ballMoving = true;
        this.lastLifeBonusScore = 0;
        this.lastBonusScore = 0;
        
        this.updateUI();
        this.resetBall();
        this.clearGameScreen();
        
        // 清除本地存檔
        localStorage.removeItem(this.saveKey);
    }

    gameLoop() {
        if (!this.gameOver && !this.isPaused) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

class Brick {
    constructor(x, y, width, height, strength) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.strength = strength;
        this.maxStrength = strength;
        this.isHidden = false;
        this.glowIntensity = 0;
        this.glowDirection = 1;
    }

    draw(ctx) {
        if (this.isHidden) return;
        
        // 根據強度設定顏色
        let colors;
        switch(this.strength) {
            case 3:
                colors = ['#FFB7C5', '#FF69B4', '#FF1493'];
                break;
            case 2:
                colors = ['#87CEEB', '#4169E1', '#0000CD'];
                break;
            default:
                colors = ['#98FB98', '#3CB371', '#2E8B57'];
        }
        
        // 創建漸層效果
        const gradient = ctx.createLinearGradient(
            this.x, this.y, 
            this.x + this.width, this.y + this.height
        );
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        
        // 更新發光效果
        this.glowIntensity += 0.05 * this.glowDirection;
        if (this.glowIntensity >= 1 || this.glowIntensity <= 0) {
            this.glowDirection *= -1;
        }
        
        // 繪製磚塊主體
        ctx.save();
        ctx.shadowColor = colors[1];
        ctx.shadowBlur = 10 * this.glowIntensity;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        
        // 繪製邊框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 如果需要顯示強度數字
        if (this.maxStrength > 1) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                this.strength, 
                this.x + this.width / 2, 
                this.y + this.height / 2
            );
        }
        
        // 添加反光效果
        const shimmer = ctx.createLinearGradient(
            this.x, this.y, 
            this.x + this.width * 0.3, this.y + this.height
        );
        shimmer.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        shimmer.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmer;
        ctx.fill();
        
        ctx.restore();
    }
}

window.onload = () => {
    new Game();
};