import pygame
import random
import settings


class Pipe:

    def __init__(self, image):

        self.image = image
        self.top_image = pygame.transform.flip(self.image, False, True)
        self.bottom_mask = pygame.mask.from_surface(self.image)
        self.top_mask = pygame.mask.from_surface(self.top_image)
        self.x = settings.WIDTH

        gap_margin = 40
        min_gap_y = 80 + settings.PIPE_GAP // 2
        max_gap_y = (
            settings.HEIGHT
            - settings.GROUND_HEIGHT
            - gap_margin
            - settings.PIPE_GAP // 2
        )
        if min_gap_y >= max_gap_y:
            self.gap_y = (min_gap_y + max_gap_y) // 2
        else:
            self.gap_y = random.randint(min_gap_y, max_gap_y)

        self.passed = False

    def update(self):

        self.x -= settings.PIPE_SPEED

    def draw(self, screen):

        # top pipe
        screen.blit(
            self.top_image,
            (self.x, self.gap_y - settings.PIPE_GAP // 2 - self.top_image.get_height())
        )

        # bottom pipe
        screen.blit(
            self.image,
            (self.x, self.gap_y + settings.PIPE_GAP // 2)
        )

    def collision(self, bird_mask, bird_rect):

        top_rect = self.top_image.get_rect(
            topleft=(
                self.x,
                self.gap_y - settings.PIPE_GAP // 2 - self.top_image.get_height(),
            )
        )

        bottom_rect = self.image.get_rect(
            topleft=(self.x, self.gap_y + settings.PIPE_GAP // 2)
        )

        if bird_rect.colliderect(top_rect):
            top_offset = (top_rect.x - bird_rect.x, top_rect.y - bird_rect.y)
            if bird_mask.overlap(self.top_mask, top_offset):
                return True

        if bird_rect.colliderect(bottom_rect):
            bottom_offset = (bottom_rect.x - bird_rect.x, bottom_rect.y - bird_rect.y)
            if bird_mask.overlap(self.bottom_mask, bottom_offset):
                return True

        return False
