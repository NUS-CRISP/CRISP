import CourseModel from '@models/Course';
import mongoose from 'mongoose';

export const exchangeCodeForToken = async (code: string) => {
  const tokenUrl = 'https://auth.atlassian.com/oauth/token';
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = `${process.env.FRONTEND_URI}/api/jira/callback`;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch access token with status: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Error fetching access token');
  }
};

export const fetchCloudIdsAndUpdateCourse = async (
  accessToken: string,
  refreshToken: string,
  courseId: string | mongoose.Types.ObjectId
) => {
  const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  try {
    const response = await fetch(cloudUrl, { headers });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch cloud IDs with status: ${response.status}`
      );
    }

    const data = await response.json();
    const cloudIds = data.map((item: { id: string }) => item.id);

    await CourseModel.findByIdAndUpdate(courseId, {
      jira: {
        isRegistered: true,
        cloudIds: cloudIds,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    });
  } catch (error) {
    console.error('Error fetching cloud IDs and updating course:', error);
    throw new Error('Error fetching cloud IDs and updating course');
  }
};

export const refreshAccessToken = async (
  refreshToken: string,
  courseId: mongoose.Types.ObjectId
) => {
  try {
    const tokenUrl = 'https://auth.atlassian.com/oauth/token';
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const tokenParams = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenParams),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to refresh access token for course with courseId: ${courseId} and status: ${response.status}`
      );
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;

    await CourseModel.findByIdAndUpdate(courseId, {
      $set: {
        'jira.accessToken': newAccessToken,
        'jira.refreshToken': newRefreshToken,
      },
    });

    console.log(`Access token refreshed for course with courseId: ${courseId}`);
    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Error refreshing access token');
  }
};
