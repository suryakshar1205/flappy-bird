import pygame

import audio_input
import settings
import ui
from app_paths import resource_path
from bird import Bird
from pipes import Pipe
from score_manager import load_highscore, load_top_scores, save_score


def quit_game():
    pygame.quit()
    raise SystemExit


def get_initial_window_size():
    display_info = pygame.display.Info()
    max_width = int(display_info.current_w * settings.MAX_WINDOW_RATIO)
    max_height = int(display_info.current_h * settings.MAX_WINDOW_RATIO)

    width = min(settings.WINDOW_WIDTH, max_width)
    height = min(settings.WINDOW_HEIGHT, max_height)

    return int(width), int(height)


def get_viewport(window_surface):
    window_width, window_height = window_surface.get_size()
    scale = min(window_width / settings.WIDTH, window_height / settings.HEIGHT)
    scale = max(scale, 0.1)

    scaled_width = int(settings.WIDTH * scale)
    scaled_height = int(settings.HEIGHT * scale)

    x = (window_width - scaled_width) // 2
    y = (window_height - scaled_height) // 2

    return pygame.Rect(x, y, scaled_width, scaled_height)


def present(window_surface, frame_surface):
    viewport = get_viewport(window_surface)
    scaled_frame = pygame.transform.smoothscale(frame_surface, viewport.size)
    window_surface.fill((19, 24, 33))
    window_surface.blit(scaled_frame, viewport.topleft)
    pygame.display.flip()
    return viewport


def to_game_coordinates(position, viewport):
    if not viewport.collidepoint(position):
        return None

    rel_x = (position[0] - viewport.x) / viewport.width
    rel_y = (position[1] - viewport.y) / viewport.height

    game_x = int(rel_x * settings.WIDTH)
    game_y = int(rel_y * settings.HEIGHT)
    return game_x, game_y


def finger_to_window_coordinates(event, window_surface):
    window_width, window_height = window_surface.get_size()
    return int(event.x * window_width), int(event.y * window_height)


def get_jump_strength(volume):
    if volume <= settings.MIC_TRIGGER:
        return None

    span = settings.MIC_MAX_LEVEL - settings.MIC_TRIGGER
    if span <= 0:
        return 0.65

    normalized = (volume - settings.MIC_TRIGGER) / span
    normalized = max(0.0, min(1.0, normalized))
    eased = normalized ** 0.65
    return min(1.0, 0.3 + eased * 0.7)


def load_image(*parts, alpha=True):
    image = pygame.image.load(resource_path(*parts))
    return image.convert_alpha() if alpha else image.convert()


def draw_scrolling_base(screen, base_image, base_x):
    y = settings.HEIGHT - settings.GROUND_HEIGHT
    tile_count = settings.WIDTH // base_image.get_width() + 3

    for index in range(tile_count):
        x = base_x + index * base_image.get_width()
        screen.blit(base_image, (x, y))


def get_mic_message():
    if not audio_input.microphone_ready():
        error = audio_input.get_error()
        if error:
            return f"Mic error: {error[:45]}"
        return "Microphone not ready"

    status = audio_input.get_status()
    if status:
        return f"Mic status: {status[:45]}"

    return "Voice control ready"


def get_mic_device_message():
    device_name = audio_input.get_selected_device_name()
    if device_name:
        return f"Input: {device_name[:40]}"

    device_names = audio_input.get_available_device_names()
    if device_names:
        return f"Detected inputs: {len(device_names)}"

    return "No microphone detected"


def run_start_menu(window_surface, frame_surface, clock, bg_image, bird_sprites, message_img, start_button_img, score_images):
    start_requested = False
    countdown_start = 0
    float_offset = 0
    float_direction = 1
    bird_index = 0
    viewport = get_viewport(window_surface)
    top_scores = load_top_scores()

    while True:
        clock.tick(settings.FPS)

        frame_surface.blit(bg_image, (0, 0))

        float_offset += float_direction * 0.5
        if float_offset > 10:
            float_direction = -1
        if float_offset < -10:
            float_direction = 1

        bird_index = (bird_index + 0.1) % 3
        bird_rect = bird_sprites[int(bird_index)].get_rect(
            center=(settings.WIDTH // 2, 220 + float_offset)
        )

        frame_surface.blit(bird_sprites[int(bird_index)], bird_rect)

        message_rect = message_img.get_rect(center=(settings.WIDTH // 2, 156))
        frame_surface.blit(message_img, message_rect)
        start_rect = start_button_img.get_rect(center=(settings.WIDTH // 2, 338))
        frame_surface.blit(start_button_img, start_rect)
        ui.draw_start_scorecard(frame_surface, fonts, top_scores, score_images)

        if start_requested:
            elapsed = pygame.time.get_ticks() - countdown_start
            if elapsed >= settings.START_DELAY_MS:
                return window_surface

        viewport = present(window_surface, frame_surface)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit_game()

            if event.type == pygame.VIDEORESIZE:
                window_surface = pygame.display.set_mode(event.size, pygame.RESIZABLE)
                viewport = get_viewport(window_surface)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_m:
                audio_input.start_microphone()

            if event.type == pygame.KEYDOWN and event.key == pygame.K_LEFTBRACKET:
                audio_input.cycle_microphone(-1)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_RIGHTBRACKET:
                audio_input.cycle_microphone(1)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if not start_requested:
                    start_requested = True
                    countdown_start = pygame.time.get_ticks()

            if event.type == pygame.KEYDOWN and event.key == pygame.K_q:
                quit_game()

            if event.type == pygame.MOUSEBUTTONDOWN:
                if not start_requested:
                    game_pos = to_game_coordinates(event.pos, viewport)
                    if game_pos is not None and start_rect.collidepoint(game_pos):
                        start_requested = True
                        countdown_start = pygame.time.get_ticks()

            if event.type == pygame.FINGERDOWN:
                if not start_requested:
                    finger_pos = finger_to_window_coordinates(event, window_surface)
                    game_pos = to_game_coordinates(finger_pos, viewport)
                    if game_pos is not None and start_rect.collidepoint(game_pos):
                        start_requested = True
                        countdown_start = pygame.time.get_ticks()


pygame.init()
pygame.display.set_caption("Flappy Bird MVP")

window = pygame.display.set_mode(get_initial_window_size(), pygame.RESIZABLE)
game_surface = pygame.Surface((settings.WIDTH, settings.HEIGHT)).convert()
clock = pygame.time.Clock()

fonts = {
    "title": pygame.font.SysFont("arial", 24, bold=True),
    "body": pygame.font.SysFont("arial", 18, bold=True),
    "small": pygame.font.SysFont("arial", 14),
}

# ---------------- LOAD ASSETS ---------------- #

bg = load_image("assets", "background-day.png", alpha=False)
bg = pygame.transform.scale(bg, (settings.WIDTH, settings.HEIGHT))

base = load_image("assets", "base.png")

game_over_img = load_image("assets", "gameover.png")
restart_img = load_image("assets", "restart-button.png")

quit_img = load_image("assets", "quit-button.png")
quit_img = pygame.transform.scale(quit_img, (90, 30))

pipe_img = load_image("assets", "pipe-green.png")

message = load_image("assets", "message.png")
start_btn_img = load_image("assets", "start_button.png")

start_btn_w, start_btn_h = start_btn_img.get_size()
start_scale = min(180 / start_btn_w, 64 / start_btn_h, 1.0)
start_btn_img = pygame.transform.smoothscale(
    start_btn_img,
    (
        int(start_btn_w * start_scale),
        int(start_btn_h * start_scale),
    ),
)

score_images = [
    load_image("assets", "0.png"),
    load_image("assets", "1.png"),
    load_image("assets", "2.png"),
    load_image("assets", "3.png"),
    load_image("assets", "4.png"),
    load_image("assets", "5.png"),
    load_image("assets", "6.png"),
    load_image("assets", "7.png"),
    load_image("assets", "8.png"),
    load_image("assets", "9.png"),
]

bird_frames = [
    load_image("assets", "bluebird-downflap.png"),
    load_image("assets", "bluebird-midflap.png"),
    load_image("assets", "bluebird-upflap.png"),
]

# ---------------- MICROPHONE ---------------- #

audio_input.start_microphone()

# ---------------- GAME SESSION LOOP ---------------- #

show_start_menu = True

while True:
    if show_start_menu:
        window = run_start_menu(window, game_surface, clock, bg, bird_frames, message, start_btn_img, score_images)

    bird = Bird(bird_frames, 80, settings.HEIGHT // 2)

    pipes = []
    frame = 0
    score = 0
    highscore = load_highscore()

    base_x = 0
    jump_timer = 0
    round_start_time = pygame.time.get_ticks()

    running = True
    return_to_menu = False

    # ---------------- GAME LOOP ---------------- #

    while running:
        clock.tick(settings.FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit_game()

            if event.type == pygame.VIDEORESIZE:
                window = pygame.display.set_mode(event.size, pygame.RESIZABLE)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_q:
                return_to_menu = True
                running = False

        if return_to_menu:
            if score > 0:
                save_score(score)
            break

        volume = audio_input.volume
        jump_timer -= 1
        grace_active = pygame.time.get_ticks() - round_start_time < settings.ROUND_GRACE_MS

        trigger_volume = audio_input.consume_trigger_level()
        jump_strength = get_jump_strength(trigger_volume)

        if jump_strength is not None and jump_timer <= 0:
            bird.jump(jump_strength)
            jump_timer = settings.JUMP_COOLDOWN

        if not grace_active:
            bird.update()
            frame += 1

        if frame > 0 and frame % settings.PIPE_SPAWN_RATE == 0:
            pipes.append(Pipe(pipe_img))

        bird_mask, bird_rect = bird.get_collision_data()

        for pipe in pipes:
            if not grace_active:
                pipe.update()

            if pipe.collision(bird_mask, bird_rect):
                running = False

            if pipe.x + pipe.image.get_width() < bird.x and not pipe.passed:
                score += 1
                pipe.passed = True

        pipes = [pipe for pipe in pipes if pipe.x > -80]

        if bird_rect.top <= -60 or bird.y > settings.HEIGHT - settings.GROUND_HEIGHT:
            running = False

        game_surface.blit(bg, (0, 0))

        for pipe in pipes:
            pipe.draw(game_surface)

        bird.draw(game_surface)

        base_x -= settings.PIPE_SPEED
        if base_x <= -base.get_width():
            base_x = 0

        draw_scrolling_base(game_surface, base, base_x)

        ui.draw_score(game_surface, score, score_images)
        ui.draw_mic_meter(game_surface, volume)
        ui.draw_text(
            game_surface,
            f"Best {highscore}",
            fonts["small"],
            settings.TEXT_COLOR,
            topleft=(196, 10),
        )
        ui.draw_text(
            game_surface,
            f"Mic {volume:.2f}",
            fonts["small"],
            settings.TEXT_COLOR,
            topleft=(10, 30),
        )
        ui.draw_text(
            game_surface,
            get_mic_message(),
            fonts["small"],
            settings.TEXT_COLOR if audio_input.microphone_ready() else settings.WARN_COLOR,
            topleft=(10, 48),
        )
        ui.draw_text(
            game_surface,
            get_mic_device_message(),
            fonts["small"],
            settings.TEXT_COLOR,
            topleft=(10, 66),
        )

        if grace_active:
            ui.draw_text(
                game_surface,
                "Get ready...",
                fonts["body"],
                settings.TEXT_COLOR,
                center=(settings.WIDTH // 2, 120),
            )

        viewport = present(window, game_surface)

    if return_to_menu:
        show_start_menu = True
        continue

    # ---------------- SAVE HIGHSCORE ---------------- #

    top_scores = save_score(score)
    if top_scores:
        highscore = top_scores[0]

    # ---------------- GAME OVER SCREEN ---------------- #

    game_over = True
    return_to_menu = False

    while game_over:
        clock.tick(settings.FPS)

        game_surface.blit(bg, (0, 0))

        for pipe in pipes:
            pipe.draw(game_surface)

        bird.draw(game_surface)

        draw_scrolling_base(game_surface, base, base_x)

        ui.draw_score(game_surface, score, score_images)

        over_rect = game_over_img.get_rect(center=(settings.WIDTH // 2, 150))
        game_surface.blit(game_over_img, over_rect)

        restart_rect = restart_img.get_rect(center=(settings.WIDTH // 2, 300))
        quit_rect = quit_img.get_rect(center=(settings.WIDTH // 2, 370))

        ui.draw_game_over_overlay(
            game_surface,
            fonts,
            score,
            highscore,
            restart_rect,
            quit_rect,
        )

        game_surface.blit(restart_img, restart_rect)
        game_surface.blit(quit_img, quit_rect)

        viewport = present(window, game_surface)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit_game()

            if event.type == pygame.VIDEORESIZE:
                window = pygame.display.set_mode(event.size, pygame.RESIZABLE)
                viewport = get_viewport(window)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_m:
                audio_input.start_microphone()

            if event.type == pygame.KEYDOWN and event.key == pygame.K_LEFTBRACKET:
                audio_input.cycle_microphone(-1)

            if event.type == pygame.KEYDOWN and event.key == pygame.K_RIGHTBRACKET:
                audio_input.cycle_microphone(1)

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    game_over = False
                    break

                if event.key == pygame.K_q:
                    return_to_menu = True
                    game_over = False
                    break

                if event.key == pygame.K_ESCAPE:
                    quit_game()

            if event.type == pygame.MOUSEBUTTONDOWN:
                game_pos = to_game_coordinates(event.pos, viewport)

                if game_pos is None:
                    continue

                if restart_rect.collidepoint(game_pos):
                    game_over = False
                    break

                if quit_rect.collidepoint(game_pos):
                    return_to_menu = True
                    game_over = False
                    break

            if event.type == pygame.FINGERDOWN:
                finger_pos = finger_to_window_coordinates(event, window)
                game_pos = to_game_coordinates(finger_pos, viewport)

                if game_pos is None:
                    continue

                if restart_rect.collidepoint(game_pos):
                    game_over = False
                    break

                if quit_rect.collidepoint(game_pos):
                    return_to_menu = True
                    game_over = False
                    break

    if return_to_menu:
        show_start_menu = True
        continue

    show_start_menu = False
