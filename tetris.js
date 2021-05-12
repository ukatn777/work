//描画の設定
var canvas=null;
var context=null;

var blockSize=40;
var blankColor='#222222';
var blockColors=['#00FFFF', '#FF8000', '#0000FF', '#8000FF', '#FF0000', '#00FF00', '#FFFF00'];

var rowCount=20;
var columnCount=10;

var margin=20;
var holdBoardX=0;
var holdBoardY=blockSize;
var mainBoardX=holdBoardX+blockSize*4+margin;
var mainBoardY=0;
var nextBoardX=mainBoardX+blockSize*columnCount+margin;
var nextBoardY=blockSize;
var fontSize=30;

//ゲームの設定
var initrow=0; //テトリミノの初期位置
var initcolumn=4; //同上
var blockArray=generateInitialBlockArray(); //左上が[row=0,column=0],-1が空きブロック、0以上はブロックあり
var subtableRowCol=4;

//定数
const tetriminoArray=[
	[[0,0], [0,-1], [0,1], [0,2]],
	[[0,0], [0,-1], [0,1], [-1,1]],
	[[0,0], [0,-1], [-1,-1], [0,1]],
	[[0,0], [0,-1], [-1,0], [0,1]],
	[[0,0], [-1,-1], [-1,0], [0,1]],
	[[0,0], [0,-1], [-1,0], [-1,1]],
	[[0,0], [-1,0], [0,1], [-1,1]],
];
/* [-1,-1] [-1,0] [-1,1] [-1,2]
*  [0,-1]  [0,0]  [0,1]  [0,2]
*  [1,-1]  [1,0]  [1,1]  [1,2]
*/
const STATE_WAIT=0;
const STATE_DROPPING=1; //テトリミノ落下中
const STATE_ERASING=2; //テトリミノ消去中
const STATE_GAMEOVER=3; //ゲームオーバー

const TICK_FIX=5; //落とせなくなってから固定されるまでにかかるtick数

//ゲームの状態
var gameState=STATE_WAIT;
var frame=0;
var currentTetriminoInfo=null;
var nextTetriminoInfo=null;
var holdTetriminoInfo=null;
var fixCount=TICK_FIX;
var holdUsed=false;
var deletedLineSum=0;

$(document).ready(function(){
	canvas=$("#canvas")[0];
	if(canvas.getContext){
		context=canvas.getContext('2d');
		initializeCanvasGame();
	}

	$(document).on("keydown",(function(eo){
		if(currentTetriminoInfo!=null){
			switch(eo.key){
				case "ArrowRight":
					currentTetriminoInfo.move(1);
					break;
				case "ArrowLeft":
					currentTetriminoInfo.move(-1);
					break;
				case "ArrowDown":
					currentTetriminoInfo.drop();
					break;
				case "z":
					currentTetriminoInfo.rotate(-1);
					break;
				case "c":
					currentTetriminoInfo.rotate(1);
					break;
				case "Shift":
					holdCurrentTetrimino();
					break;
				default:
					break;
			}
			drawCurrentTetriminoInfo();
		}
	}));

	gameState=STATE_DROPPING;

	setInterval(function(){
		tick();
	},100) //10tick/sec
});

function initializeCanvasGame(){
	context.clearRect(0,0,canvas.width,canvas.height);
	drawMainBoard();
	drawNextBoard();
	drawHoldBoard();
	drawConstantLabel();
	drawLineSumLabel();
}

/**
 *メインのboardを描画する
 *
 */
function drawMainBoard(){
	let x=mainBoardX;
	let y=mainBoardY;
	for(let r=0; r<rowCount; ++r){
		for(let c=0; c<columnCount; ++c){
			block=blockArray[r][c]
			color=(block>=0)?blockColors[block]:blankColor;
			drawSingleBlock(x,y,color);
			x+=blockSize;
		}
		x=mainBoardX;
		y+=blockSize;
	}
}

/**
 *NEXTを表示するboardを描画する
 *
 */
function drawNextBoard(){
	drawSubBoard(nextBoardX,nextBoardY,4,4,nextTetriminoInfo);
}

/**
 *HOLDを表示するboardを描画する
 *
 */
function drawHoldBoard(){
	drawSubBoard(holdBoardX,holdBoardY,4,4,holdTetriminoInfo);
}

/**
 *メイン以外のboardの描画
 *
 * @param {*} startX
 * @param {*} startY
 * @param {*} boardRowCount
 * @param {*} boardColumnCount
 * @param {*} tetriminoInfo
 */
function drawSubBoard(startX,startY,boardRowCount,boardColumnCount,tetriminoInfo){
	let x=startX;
	let y=startY;
	for(let r=0;r<boardRowCount;++r){
		for(let c=0;c<boardColumnCount;++c){
			drawSingleBlock(x,y,blankColor);
			x+=blockSize;
		}
		x=startX;
		y+=blockSize;
	}
	if(tetriminoInfo!=null){
		let zeroX=startX+blockSize; //左から2つ目、上から3つ目のマスが[0,0]
		let zeroY=startY+blockSize*2; //
		drawTetrimino(zeroX,zeroY,tetriminoInfo,tetriminoInfo.color,0,0);
	}
}

function drawCurrentTetriminoInfo(){
	drawTetrimino(mainBoardX,mainBoardY,currentTetriminoInfo);
}

function undrawCurrentTetriminoInfo(){
	drawTetrimino(mainBoardX,mainBoardY,currentTetriminoInfo,blankColor);
}

function drawConstantLabel(){
	drawTextAlignCenter("HOLD",holdBoardX+blockSize*2,0);
	drawTextAlignCenter("NEXT",nextBoardX+blockSize*2,0);
	drawTextAlignLeft("LINE",nextBoardX,blockSize*6);
}

function drawLineSumLabel(){
	context.clearRect(nextBoardX,blockSize*7,canvas.width-nextBoardX,blockSize);
	drawTextAlignLeft(deletedLineSum,nextBoardX+blockSize,blockSize*7);
}

/**
 *テキストを中央揃えで描画
 *
 * @param {*} text
 * @param {*} x テキストの中央上のx
 * @param {*} y テキストの中央上のy
 */
function drawTextAlignCenter(text,x,y){
	context.fillStyle='#FFFFFF';
	context.font="bold "+fontSize+"px serif";
	let width=context.measureText(text).width;
	context.fillText(text,x-width/2,y+fontSize);
}

function drawTextAlignLeft(text,x,y){
	context.fillStyle='#FFFFFF';
	context.font="bold "+fontSize+"px serif";
	let width=context.measureText(text).width;
	context.fillText(text,x,y+fontSize);
}

/**
 *boardにテトリミノを1つ描画
 *
 * @param {*} boardZeroX boardの[0,0]のマスのX
 * @param {*} boardZeroY boardの[0,0]のマスのY
 * @param {*} tetriminoInfo 
 * @param {*} row テトリミノの中心のrowIndex
 * @param {*} column テトリミノの中心のcolumnIndex
 */
function drawTetrimino(boardZeroX,boardZeroY,tetriminoInfo,color=tetriminoInfo.color,row=tetriminoInfo.row,column=tetriminoInfo.column){
	for(let i=0;i<tetriminoInfo.tetrimino.length;++i){
		let block=tetriminoInfo.tetrimino[i];
		let x=boardZeroX + blockSize*column + blockSize*block[1];
		let y=boardZeroY + blockSize*row + blockSize*block[0];
		drawSingleBlock(x,y,color);
	}
}

function drawSingleBlock(x,y,color){
	context.fillStyle=color;
	context.fillRect(x+1,y+1,blockSize-2,blockSize-2);
}

/**
 * ゲーム開始時のテトリミノがない空のブロック配列を生成する
 */
function generateInitialBlockArray(){
	var result=new Array(rowCount);
	for(let r=0; r<rowCount; ++r){
		result[r]=new Array(columnCount);
		for(let c=0; c<columnCount; ++c){
			result[r][c]=-1;
		}
	}
	return result;
}

/**
 * 指定した位置にブロックを置けるかどうかを調べる
 * @param {*} row
 * @param {*} column
 * @param {*} resultOutOfIndex 範囲外の時に返される値(default=false)
 * @return {*} true/false
 */
function canPutBlock(row, column, resultOutOfIndex=false){
	if(row<0 || row>=rowCount || column<0 || column>=columnCount){
		return resultOutOfIndex;
	}
	return blockArray[row][column]<0;
}

/**
 * 指定した位置にブロックを置く
 * @param {*} row 
 * @param {*} column 
 * @param {*} index 
 * @returns 
 */
function putBlock(row, column, index){
	if(row>=0 && row<rowCount && column>=0 && column<columnCount){
		blockArray[row][column]=index;
	}
}

/**
 *現在のテトリミノをholdする
 *
 */
function holdCurrentTetrimino(){
	if(holdUsed){return;}
	let temp=holdTetriminoInfo;
	holdTetriminoInfo=currentTetriminoInfo;
	holdTetriminoInfo.setAtInitPosition();
	holdTetriminoInfo.setAtInitRotation();
	if(temp!=null){
		currentTetriminoInfo=temp;
	}
	else{
		currentTetriminoInfo=nextTetriminoInfo;
		nextTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
		drawNextBoard();
	}
	holdUsed=true;
	if(holdTetriminoInfo!=null){
		drawHoldBoard();
	}
	if(currentTetriminoInfo.isGameOver()){
		gameState=STATE_GAMEOVER;
	}
}

class TetriminoInfo{
	constructor(index, row, column){
		this.index=index;
		this.tetrimino=[];
		var temp=tetriminoArray[index];
		for(let i=0; i<temp.length; ++i){
			this.tetrimino.push([].concat(temp[i]));
		} //this.tetriminoは回転させるのでコピー
		this.row=row;
		this.column=column;
		this.color=blockColors[index];
		this.rotateSum=0;
	}

	static generateNextTetrimino(index){
		return new TetriminoInfo(index,initrow,initcolumn);
	}

	/**
	 *ランダムなテトリミノのinfoを1つ生成
	 *
	 * @static
	 * @return {*} 
	 * @memberof TetriminoInfo
	 */
	static generateRandomTetrimino(){
		return this.generateNextTetrimino(Math.floor(Math.random()*tetriminoArray.length));
	}

	/**
	 * 今の位置に固定する
	 * 
	 */
	putOnCurrentPosition(){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			putBlock(this.row+block[0], this.column+block[1], this.index);
		}
	}

	/**
	 *指定しただけrow,columnをずらした位置に置けるかどうか調べる
	 *
	 * @param {*} rowAdder
	 * @param {*} columnAdder
	 * @memberof TetriminoInfo
	 * @returns true/false
	 */
	_canShiftTo(rowAdder, columnAdder){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			if(!canPutBlock(this.row+rowAdder+block[0], this.column+columnAdder+block[1])){
				return false;
			}
		}
		return true;
	}

	/**
	 * 1マス下に置けるかを調べる
	 * private
	 * @returns true/false
	 */
	_canDrop(){
		return this._canShiftTo(1,0);
	}

	/**
	 *1マス下に移動させる
	 * @return {*} 移動できたらtrue/できなかったらfalse
	 * @memberof TetriminoInfo
	 */
	drop(){
		let result=false;
		undrawCurrentTetriminoInfo();
		if(this._canDrop()){
			this.row+=1;
			result=true;
		}
		drawCurrentTetriminoInfo();
		return result;
	}

	/**
	 *横に移動できるかを調べる
	 *private
	 * @param {*} columnAdder columnの変位、左なら-1,右なら+1
	 * @memberof TetriminoInfo 
	 * @returns true/false
	 */
	_canMove(columnAdder){
		return this._canShiftTo(0,columnAdder);
	}

	/**
	 *横に移動できるかをチェックして、移動可能なら移動させる
	 *
	 * @param {*} columnAdder columnの変位左なら-1,右なら+1
	 * @memberof TetriminoInfo
	 * @returns 移動できたならtrue,できなかったらfalse
	 */
	move(columnAdder){
		let result=false;
		undrawCurrentTetriminoInfo();
		if(this._canMove(columnAdder)){
			this.column+=columnAdder;
			result=true;
		}
		drawCurrentTetriminoInfo();
		return result;
	}

	/**
	 *回転できるかを調べる
	 *・右回転
	 *　[0  1][r]=[ c]
	 *　[-1 0][c] [-r]
	 *・左回転
	 *　[0 -1][r]=[-c]　
	 *　[1  0][c] [ r]
	 * @param {*} rotation 回転方向,左回転なら-1,右回転なら1
	 * @param {*} isForce trueの場合ブロックが置けない場合でも新しいテトリミノ配列を返す
	 * @memberof TetriminoInfo
	 * @returns 新しいtetrimino配列、回転できないならnull
	 */
	_canRotate(rotation, isForce=false){
		let result=[];
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			let temp=[rotation*block[1], -rotation*block[0]];
			if(!canPutBlock(this.row+temp[0], this.column+temp[1]) && !isForce){
				return null;
			}
			result.push(temp);
		}
		return result;
	}

	/**
	 *回転させる
	 *
	 * @param {*} rotation 回転方向,左回転なら-1,右回転なら1
	 * @memberof TetriminoInfo
	 */
	rotate(rotation){
		undrawCurrentTetriminoInfo();
		let nextMino=this._canRotate(rotation);
		if(nextMino!=null){
			this.tetrimino=nextMino;
			this.rotateSum+=rotation;
			if(this.rotateSum==-4 || this.rotateSum==4){ //一回転したら回転していないのと同じ
				this.rotateSum=0;
			}
		}
		drawCurrentTetriminoInfo();
	}

	/**
	 * ゲームオーバー状態であるかどうか
	 *
	 * @return {*} 
	 * @memberof TetriminoInfo
	 */
	isGameOver(){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			if(!canPutBlock(this.row+block[0], this.column+block[1], true)){
				return true;
			}
		}
		return false;
	}

	/**
	 *初期位置に戻す
	 *
	 * @memberof TetriminoInfo
	 */
	setAtInitPosition(){
		this.row=initrow;
		this.column=initcolumn;
	}

	/**
	 *初期の回転に戻す
	 *
	 * @memberof TetriminoInfo
	 */
	setAtInitRotation(){
		while(this.rotateSum!=0){
			let num=this.rotateSum>0? -1:1;
			this.tetrimino=this._canRotate(num, true);
			this.rotateSum+=num;
		}
	}
}

/**
 * 毎フレーム呼び出されるゲーム処理
 *
 */
function tick(){
	frame+=1;
	switch(gameState){
		case STATE_WAIT:
			tickWaiting();
			break;
		case STATE_DROPPING:
			tickDropping();
			break;
		case STATE_ERASING:
			tickErasing();
			break;
		case STATE_GAMEOVER:
			tickGameOver();
			break;
		default:
			break;
	}
}

/**
 * gameStateがSTATE_WAITのときの処理
 * 次のテトリミノを設定する
 */
function tickWaiting(){
	if(currentTetriminoInfo==null){
		if(nextTetriminoInfo==null){
			currentTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
		}
		else{
			currentTetriminoInfo=nextTetriminoInfo;
		}
		nextTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
	}
	if(currentTetriminoInfo.isGameOver()){
		gameState=STATE_GAMEOVER;
		return;
	}
	drawCurrentTetriminoInfo();
	if(nextTetriminoInfo!=null){
		drawNextBoard();
	}
	gameState=STATE_DROPPING;
}

/**
 * gameStateがSTATE_DROPPINGの時の処理
 * テトリミノを1マス落とし、落とせないなら位置を確定させる
 */
function tickDropping(){
	if(currentTetriminoInfo==null){
		gameState=STATE_WAIT;
	}
	else{
		drawMainBoard();
		let dropped=currentTetriminoInfo.drop()
		if(dropped){ //落下できた場合
			fixCount=TICK_FIX;
		}
		else{
			fixCount-=1;
			if(fixCount<=0){
				drawCurrentTetriminoInfo();
				currentTetriminoInfo.putOnCurrentPosition();
				currentTetriminoInfo=null;
				holdUsed=false;
				gameState=STATE_ERASING;
			}
		}
	}
}

/**
 * gameStateがSTATE_ERASINGの時の処理
 * 
 */
function tickErasing(){
	eraseFilledLine();
	drawMainBoard();
	gameState=STATE_WAIT;
}

/**
 * ブロックを消せるlineを消去
 */
function eraseFilledLine(){
	blockArray=blockArray.filter(function(rowArray){
		for(let c=0; c<columnCount; ++c){
			if(rowArray[c]<0){
				return true;
			}
		}
		return false;
	});
	while(blockArray.length<rowCount){
		blockArray.unshift(generateNewRowLine());
		deletedLineSum+=1;
	}
	drawLineSumLabel();
}

/**
 * 新しい行の配列を作成
 */
function generateNewRowLine(){
	result=[];
	for(let c=0; c<columnCount; ++c){
		result.push(-1);
	}
	return result;
}

function tickGameOver(){
	console.log("GAME OVER");
}