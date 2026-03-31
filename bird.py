import pygame
from settings import GRAVITY, MAX_JUMP_FORCE, MIN_JUMP_FORCE


class Bird:

    def __init__(self, frames, x, y):

        self.frames = frames
        self.index = 0

        self.x = x
        self.y = y

        self.velocity = 0
        self.angle = 0

    def jump(self, strength=1.0):
        strength = max(0.0, min(1.0, strength))
        jump_force = MIN_JUMP_FORCE + (MAX_JUMP_FORCE - MIN_JUMP_FORCE) * strength
        self.velocity = jump_force

    def update(self):

        # apply gravity
        self.velocity += GRAVITY

        # limit fall speed
        if self.velocity > 4:
            self.velocity = 4
        # limit upward speed
        if self.velocity < -4.5:
            self.velocity = -4.5

        self.y += self.velocity

        # rotation logic
        if self.velocity < 0:
            self.angle = 25
        else:
            self.angle = max(self.angle - 3, -90)

        # animation
        self.index = (self.index + 1) % len(self.frames)

    def draw(self, screen):

        bird = self.frames[self.index]

        rotated = pygame.transform.rotate(bird, self.angle)

        rect = rotated.get_rect(center=(self.x, self.y))

        screen.blit(rotated, rect)

    def get_collision_data(self):
        bird = self.frames[self.index]
        rect = bird.get_rect(center=(self.x, self.y))
        mask = pygame.mask.from_surface(bird)
        return mask, rect

    def get_rect(self):
        return self.get_collision_data()[1]
