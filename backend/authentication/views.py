import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, SwitchPersonaSerializer

logger = logging.getLogger('urbanvault')


class SeededPersonasListView(APIView):
    """
    List seeded user personas to populate the 1-click persona switcher in the UI.
    No credentials required to fetch the persona directory.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        personas = User.objects.filter(is_active=True).select_related('client', 'department').order_by('id')
        serializer = UserSerializer(personas, many=True)
        return Response({
            'personas': serializer.data
        })


class SwitchPersonaView(APIView):
    """
    1-Click persona switch: generates standard JWT access and refresh tokens
    for the selected seeded persona, allowing instant evaluation without manual login forms.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SwitchPersonaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        try:
            user = User.objects.select_related('client', 'department').get(username=username)
        except User.DoesNotExist:
            return Response(
                {'detail': f'Persona user "{username}" does not exist.'},
                status=status.HTTP_404_NOT_FOUND
            )

        refresh = RefreshToken.for_user(user)
        # Add custom claims if needed
        refresh['role'] = user.role
        refresh['username'] = user.username

        logger.info(f"User switched persona to {user.username} (role: {user.role})")

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    Retrieve details of the authenticated user from the active JWT token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
