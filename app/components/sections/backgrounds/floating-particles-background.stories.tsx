import type { Meta, StoryObj } from "@storybook/react";
import { RefreshStoryWrapper } from "stories/utils/refresh-story-wrapper";

import FloatingParticlesBackground from "./floating-particles-background";

const meta = {
  title: "Molecules/Backgrounds/Floating Particles",
  component: FloatingParticlesBackground,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    count: { control: "number" },
  },
  args: {
    count: 10,
  },
} satisfies Meta<typeof FloatingParticlesBackground>;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    count: 150,
    style: {
      height: "100px",
      width: "1000px",
    },
  },
  decorators: [
    (Story, context) => {
      return (
        <RefreshStoryWrapper>
          <Story args={{ ...context.args }} />
        </RefreshStoryWrapper>
      );
    },
  ],
};

export default meta;
