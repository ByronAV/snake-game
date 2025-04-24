import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SnakeGame.css'; 

// ---- CONSTANTS ----
const GRID_SIZE = 20; // Number of cells in width/height
const CELL_SIZE = 20; // Size of each cell in pixels
const BOARD_SIZE = GRID_SIZE * CELL_SIZE; // Total board size in pixels
const DIRECTIONS = {
    ArrowUp: {x: 0, y: -1},
    ArrowDown: {x: 0, y: 1},
    ArrowLeft: {x: -1, y: 0},
    ArrowRight: {x: 1, y: 0}
};
const INITIAL_SNAKE = [{x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2)}];
const INITIAL_DIRECTION = DIRECTIONS.ArrowRight;
const GAME_SPEED_START = 200; // Milliseconds between updates
const SPEED_INCREMENT = 5; // Speed increase per food item

// ---- HELPER FUNCTIONS ----
const getRandomPosition = (snakeBody = []) => {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
        };
    } while (
        // Ensure food doesn't spawn on the snake
        snakeBody.some(segment => segment.x === position.x && segment.y === position.y)
    );
    return position;
};

// ---- COMPONENTS ----
function SnakeGame() {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(getRandomPosition(INITIAL_SNAKE));
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [nextDirection, setNextDirection] = useState(INITIAL_DIRECTION); // Buffer next move
    const [speed, setSpeed] = useState(GAME_SPEED_START);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    const gameLoopTimeoutRef = useRef(null);
    const boardRef = useRef(null); // ref for the game board to set focus
    const savedMoveSnake = useRef();

    // ---- Game Logic ----

    const resetGame = useCallback(() => {
        clearTimeout(gameLoopTimeoutRef.current); // Clear existing game loop
        setSnake(INITIAL_SNAKE);
        setFood(getRandomPosition(INITIAL_SNAKE));
        setDirection(INITIAL_DIRECTION);
        setNextDirection(INITIAL_DIRECTION);
        setSpeed(GAME_SPEED_START);
        setScore(0);
        setGameOver(false);
        setGameStarted(false);
        // Give the board focus to capture the key presses immediatelly after restart
        if (boardRef.current) {
            boardRef.current.focus();
        }
    }, []); // No dependencies neede as it uses constants or setters

    const moveSnake = useCallback(() => {
        if (gameOver || !gameStarted) return;

        setDirection(nextDirection); // Update direction for this move

        setSnake(prevSnake => {
            const newHead = {
                x: (prevSnake[0].x + nextDirection.x), // Wrap around walls
                y: (prevSnake[0].y + nextDirection.y), // Wrap around walls
            };

            // Check for self-collision
            const selfCollision = prevSnake.some(
                (segment, index) => index !== 0 && segment.x === newHead.x && segment.y === newHead.y
            );

            // --- Wall Collision (Optional - currently wrapping) ---
            // If you want game over on wall hit instead of wrapping:
            const wallCollision = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
            if (selfCollision || wallCollision) {
               setGameOver(true);
               clearTimeout(gameLoopTimeoutRef.current);
               return prevSnake;
            }

            const newSnake = [newHead, ...prevSnake];

            // Check for food collision
            if (newHead.x === food.x && newHead.y === food.y) {
                setScore(prevScore => prevScore + 1);
                setFood(getRandomPosition(newSnake)); // Generate new food, avoiding the new snake
                setSpeed(prevSpeed => Math.max(50, prevSpeed - SPEED_INCREMENT)); // Increase speed, with a minimum limit
                // Don't pop the tail, snake grows
            } else {
                newSnake.pop(); // Remove the tail segment if no food was eaten
            }

            return newSnake;
        });
    }, [nextDirection, food, gameOver, gameStarted]); // Include dependencies

    // ---- Effects ----

    // Game Loop Timer
    useEffect(() => {
        if (gameOver || !gameStarted) {
            clearTimeout(gameLoopTimeoutRef.current);
            return; // Stop the loop if game over or not started
        }

        // Clear previous timeout before setting a new one
        clearTimeout(gameLoopTimeoutRef.current);

        gameLoopTimeoutRef.current = setTimeout(moveSnake, speed);

        // Cleanup function to clear timeout when component unmounts or dependencies change
        return () => clearTimeout(gameLoopTimeoutRef.current);

    }, [snake, speed, gameOver, gameStarted]); // Re-run effect when these change

    // Handle keyboard input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (DIRECTIONS[e.key]) {
                e.preventDefault(); // Prevent arrow keys from scrolling the page

                // Prevent reversing direction directly
                const currentMove = direction;
                const nextMove = DIRECTIONS[e.key];

                if (
                    (currentMove.x !== 0 && currentMove.x === -nextMove.x) ||
                    (currentMove.y !== 0 && currentMove.y === -nextMove.y)
                ) {
                    return; // Ignore reverse direction input
                }
                setNextDirection(nextMove); // Buffer the next direction
            }
        };

        // Add listener only when game boards has focus potential
        const boardElement = boardRef.current;
        if (boardElement) {
            boardElement.addEventListener('keydown', handleKeyDown);
        }

        // Cleanup function
        return () => {
            if (boardElement) {
                boardElement.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [direction]); // Re-run only if the current direction changes (for the reverse check)

    // Focus the board on initial mount to capture keys
    useEffect(() => {
        if (boardRef.current) {
            boardRef.current.focus();
        }
    }, []); // Empty dependencyy array ensures this runs only once on mount

    const startGame = () => {
        resetGame(); // Reset first to ensure clean state
        setGameStarted(true);
        // Focus thew board to capture key presses immediatelly
        if (boardRef.current) {
            boardRef.current.focus();
        }
    }

    // ---- Rendering ----
    return (
        <div
            className="game-container"
            // Use tabIndex to make the div focusable for keydown events
            tabIndex="0"
            ref={boardRef}
            style={{ '--board-size': `${BOARD_SIZE}px` }} // Pass board size as CSS variable
        >
            <div className="score-board">Score: {score}</div>
            <div
                className="game-board"
                style={{
                    width: `${BOARD_SIZE}px`,
                    height: `${BOARD_SIZE}px`,
                    '--grid-size': GRID_SIZE, // Pass grid size as CSS variable
                    '--cell-size': `${CELL_SIZE}px` // Pass cell size as CSS variable
                }}
                >
                    { /* Render Snake */ }
                    {snake.map((segment, index) => (
                        <div
                            key={index}
                            className="snake-segment"
                            style={{
                                left: `${segment.x * CELL_SIZE}px`,
                                top: `${segment.y * CELL_SIZE}px`,
                                width: `${CELL_SIZE}px`,
                                height: `${CELL_SIZE}px`,
                            }}
                            />
                    ))}

                    { /* Render Food */ }
                    <div
                        className="food"
                        style={{
                            left: `${food.x * CELL_SIZE}px`,
                            top: `${food.y * CELL_SIZE}px`,
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                        }}
                        />

                    { /* Game Over / Start Screen */ }
                    {(!gameStarted || gameOver) && (
                        <div className="overlay">
                            {gameOver && <div className="game-over-text">GAME OVER!</div>}
                            <button onClick={startGame}>
                                {gameOver ? 'Restart Game' : 'Start Game'}
                            </button>
                        </div>
                    )}
            </div>
        </div>
    );
}

export default SnakeGame;