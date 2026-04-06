import pygame
import settings


def draw_score(screen, score, score_images):

    digits = [int(d) for d in str(score)]

    total_width = 0

    for d in digits:
        total_width += score_images[d].get_width()

    x = (screen.get_width() - total_width) // 2
    y = 40

    for d in digits:

        screen.blit(score_images[d], (x, y))
        x += score_images[d].get_width()


def draw_mic_meter(screen, volume):

    meter = max(0, min(100, int(volume * 100)))

    pygame.draw.rect(screen, settings.PANEL_COLOR, (10, 10, 100, 15), 2)
    pygame.draw.rect(screen, settings.WARN_COLOR, (10, 10, meter, 15))


def draw_text(screen, text, font, color, center=None, topleft=None):

    text_surface = font.render(text, True, color)
    rect = text_surface.get_rect()

    if center is not None:
        rect.center = center
    elif topleft is not None:
        rect.topleft = topleft

    screen.blit(text_surface, rect)
    return rect


def draw_panel(screen, rect, alpha=215):

    shadow = pygame.Surface((rect.width + 8, rect.height + 8), pygame.SRCALPHA)
    shadow.fill(settings.PANEL_SHADOW)
    screen.blit(shadow, (rect.x + 6, rect.y + 6))

    panel = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    panel.fill((*settings.TEXT_DARK, alpha))
    pygame.draw.rect(panel, settings.PANEL_COLOR, panel.get_rect(), 3, border_radius=12)
    screen.blit(panel, rect.topleft)


def draw_game_over_overlay(screen, fonts, score, highscore, restart_rect, quit_rect):

    panel_rect = pygame.Rect(36, 108, screen.get_width() - 72, 312)
    draw_panel(screen, panel_rect, alpha=180)

    draw_text(screen, "Session Over", fonts["title"], settings.TEXT_COLOR, center=(screen.get_width() // 2, 124))
    draw_text(screen, f"Score: {score}", fonts["body"], settings.TEXT_COLOR, center=(screen.get_width() // 2, 170))
    draw_text(screen, f"Best: {highscore}", fonts["small"], settings.ACCENT_COLOR, center=(screen.get_width() // 2, 194))
    draw_text(screen, "R: Restart | Q: Menu", fonts["small"], settings.TEXT_COLOR, center=(screen.get_width() // 2, 230))

    pygame.draw.rect(screen, settings.PANEL_COLOR, restart_rect.inflate(10, 10), 2, border_radius=10)
    pygame.draw.rect(screen, settings.PANEL_COLOR, quit_rect.inflate(10, 10), 2, border_radius=10)


def draw_trophy_icon(screen, x, y, scale=1.0):

    def scaled(value):
        return max(1, int(round(value * scale)))

    cup_color = (244, 180, 42)
    shadow_color = (173, 117, 20)
    highlight_color = (255, 221, 97)

    pygame.draw.rect(screen, shadow_color, (x + scaled(8), y + scaled(8), scaled(18), scaled(10)))
    pygame.draw.polygon(
        screen,
        cup_color,
        [
            (x + scaled(4), y + scaled(8)),
            (x + scaled(30), y + scaled(8)),
            (x + scaled(24), y + scaled(25)),
            (x + scaled(10), y + scaled(25)),
        ],
    )
    pygame.draw.rect(screen, cup_color, (x + scaled(14), y + scaled(25), scaled(6), scaled(10)))
    pygame.draw.rect(screen, cup_color, (x + scaled(10), y + scaled(34), scaled(14), scaled(5)))
    pygame.draw.arc(screen, cup_color, (x - scaled(1), y + scaled(10), scaled(12), scaled(12)), 1.2, 5.1, max(1, scaled(3)))
    pygame.draw.arc(screen, cup_color, (x + scaled(23), y + scaled(10), scaled(12), scaled(12)), -2.0, 2.0, max(1, scaled(3)))
    pygame.draw.rect(screen, highlight_color, (x + scaled(10), y + scaled(11), scaled(10), scaled(4)))


def draw_digit_number(screen, number, digit_images, right, centery, scale=0.45):

    digits = [int(digit) for digit in str(max(0, int(number)))]
    scaled_images = []

    total_width = 0
    max_height = 0
    for digit in digits:
        source = digit_images[digit]
        width = max(1, int(source.get_width() * scale))
        height = max(1, int(source.get_height() * scale))
        image = pygame.transform.smoothscale(source, (width, height))
        scaled_images.append(image)
        total_width += width
        max_height = max(max_height, height)

    x = right - total_width
    y = centery - max_height // 2

    for image in scaled_images:
        screen.blit(image, (x, y + (max_height - image.get_height()) // 2))
        x += image.get_width()


def draw_start_scorecard(screen, fonts, top_scores, digit_images):

    panel_width = 196
    panel_rect = pygame.Rect((screen.get_width() - panel_width) // 2, 394, panel_width, 102)
    outer_green = (67, 150, 54)
    mid_green = (137, 214, 90)
    inner_shadow = (46, 69, 31)
    parchment = (248, 243, 221)
    parchment_edge = (214, 200, 152)
    title_color = (33, 33, 33)
    dark_text = (29, 29, 29)
    title_font = pygame.font.SysFont("arial", 15, bold=True)
    rank_font = pygame.font.SysFont("arial", 11, bold=True)

    shadow = pygame.Surface((panel_rect.width + 10, panel_rect.height + 10), pygame.SRCALPHA)
    pygame.draw.rect(shadow, (0, 0, 0, 72), shadow.get_rect(), border_radius=16)
    screen.blit(shadow, (panel_rect.x + 5, panel_rect.y + 6))

    pygame.draw.rect(screen, outer_green, panel_rect, border_radius=14)
    pygame.draw.rect(screen, inner_shadow, panel_rect.inflate(-6, -6), border_radius=12)
    pygame.draw.rect(screen, mid_green, panel_rect.inflate(-10, -10), border_radius=10)

    inner_rect = panel_rect.inflate(-20, -20)
    pygame.draw.rect(screen, parchment_edge, inner_rect, border_radius=8)
    pygame.draw.rect(screen, parchment, inner_rect.inflate(-6, -6), border_radius=8)
    pygame.draw.line(
        screen,
        (255, 255, 240),
        (inner_rect.x + 12, inner_rect.y + 10),
        (inner_rect.right - 32, inner_rect.y + 10),
        2,
    )

    draw_text(
        screen,
        "SCORE CARD",
        title_font,
        title_color,
        center=(panel_rect.centerx - 8, panel_rect.y + 18),
    )
    draw_trophy_icon(screen, panel_rect.right - 30, panel_rect.y + 8, scale=0.5)

    scores = list(top_scores[:5])
    while len(scores) < 5:
        scores.append(0)

    row_top = inner_rect.y + 24
    row_step = 11
    rank_x = inner_rect.x + 14
    score_right = inner_rect.right - 16

    for index, score in enumerate(scores, start=1):
        row_center = row_top + (index - 1) * row_step
        rank_surface = rank_font.render(f"{index}.", True, dark_text)
        rank_rect = rank_surface.get_rect(midleft=(rank_x, row_center))
        screen.blit(rank_surface, rank_rect)
        draw_digit_number(screen, score, digit_images, score_right, row_center, scale=0.23)
