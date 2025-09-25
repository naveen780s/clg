#!/bin/bash

# Frontend-Backend Integration Test Script
echo "🚀 Starting Frontend-Backend Integration Tests"
echo "==============================================="

API_BASE="http://localhost:5001/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Registration
echo -e "\n${YELLOW}🧪 Testing Registration...${NC}"

# Register mentor
echo "📝 Registering mentor..."
MENTOR_RESPONSE=$(curl -s -X POST $API_BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Test Mentor",
    "email": "mentor@integration.test",
    "password": "TestPass123!",
    "phone": "9876543211",
    "role": "mentor",
    "department": "Computer Science"
  }')

if echo "$MENTOR_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Mentor registered successfully${NC}"
    MENTOR_ID=$(echo "$MENTOR_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Mentor registration failed${NC}"
    echo "$MENTOR_RESPONSE"
fi

# Register HOD
echo "📝 Registering HOD..."
HOD_RESPONSE=$(curl -s -X POST $API_BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Test HOD",
    "email": "hod@integration.test",
    "password": "TestPass123!",
    "phone": "9876543212",
    "role": "hod",
    "department": "Computer Science"
  }')

if echo "$HOD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ HOD registered successfully${NC}"
else
    echo -e "${RED}❌ HOD registration failed${NC}"
    echo "$HOD_RESPONSE"
fi

# Register student (with mentor ID if available)
echo "📝 Registering student..."
if [ ! -z "$MENTOR_ID" ]; then
    STUDENT_RESPONSE=$(curl -s -X POST $API_BASE/auth/register \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Integration Test Student\",
        \"email\": \"student@integration.test\",
        \"password\": \"TestPass123!\",
        \"phone\": \"9876543213\",
        \"role\": \"student\",
        \"department\": \"Computer Science\",
        \"year\": 3,
        \"student_id\": \"CS2023001\",
        \"hostel_block\": \"A\",
        \"room_number\": \"101\",
        \"mentor_id\": \"$MENTOR_ID\"
      }")
else
    echo -e "${YELLOW}⚠️ Mentor ID not available, registering student without mentor${NC}"
    STUDENT_RESPONSE=$(curl -s -X POST $API_BASE/auth/register \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Integration Test Student",
        "email": "student@integration.test",
        "password": "TestPass123!",
        "phone": "9876543213",
        "role": "student",
        "department": "Computer Science",
        "year": 3,
        "student_id": "CS2023001",
        "hostel_block": "A",
        "room_number": "101"
      }')
fi

if echo "$STUDENT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Student registered successfully${NC}"
else
    echo -e "${RED}❌ Student registration failed${NC}"
    echo "$STUDENT_RESPONSE"
fi

# Test Login
echo -e "\n${YELLOW}🧪 Testing Login...${NC}"

# Login student
echo "🔐 Logging in student..."
STUDENT_LOGIN=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@integration.test",
    "password": "TestPass123!"
  }')

if echo "$STUDENT_LOGIN" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Student login successful${NC}"
    STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Student login failed${NC}"
    echo "$STUDENT_LOGIN"
fi

# Login mentor
echo "🔐 Logging in mentor..."
MENTOR_LOGIN=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor@integration.test",
    "password": "TestPass123!"
  }')

if echo "$MENTOR_LOGIN" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Mentor login successful${NC}"
    MENTOR_TOKEN=$(echo "$MENTOR_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Mentor login failed${NC}"
    echo "$MENTOR_LOGIN"
fi

# Login HOD
echo "🔐 Logging in HOD..."
HOD_LOGIN=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hod@integration.test",
    "password": "TestPass123!"
  }')

if echo "$HOD_LOGIN" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ HOD login successful${NC}"
    HOD_TOKEN=$(echo "$HOD_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ HOD login failed${NC}"
    echo "$HOD_LOGIN"
fi

# Test Profile Access
echo -e "\n${YELLOW}🧪 Testing Profile Access...${NC}"

if [ ! -z "$STUDENT_TOKEN" ]; then
    PROFILE_RESPONSE=$(curl -s -X GET $API_BASE/users/profile \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    
    if echo "$PROFILE_RESPONSE" | grep -q '"name"'; then
        echo -e "${GREEN}✅ Profile access successful${NC}"
    else
        echo -e "${RED}❌ Profile access failed${NC}"
        echo "$PROFILE_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping profile test - no student token${NC}"
fi

# Test Gate Pass Creation
echo -e "\n${YELLOW}🧪 Testing Gate Pass Creation...${NC}"

if [ ! -z "$STUDENT_TOKEN" ]; then
    # Calculate future timestamps
    EXIT_TIME=$(date -u -d '+2 hours' '+%Y-%m-%dT%H:%M:%SZ')
    RETURN_TIME=$(date -u -d '+6 hours' '+%Y-%m-%dT%H:%M:%SZ')
    
    PASS_RESPONSE=$(curl -s -X POST $API_BASE/passes \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -d "{
        \"reason\": \"Integration test medical appointment\",
        \"destination\": \"City Hospital\",
        \"exitTime\": \"$EXIT_TIME\",
        \"returnTime\": \"$RETURN_TIME\",
        \"category\": \"medical\",
        \"emergency_contact\": {
          \"name\": \"Parent Name\",
          \"phone\": \"9876543214\",
          \"relation\": \"Father\"
        }
      }")
    
    if echo "$PASS_RESPONSE" | grep -q '"_id"'; then
        echo -e "${GREEN}✅ Gate pass created successfully${NC}"
        PASS_ID=$(echo "$PASS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        # Test mentor approval if mentor token available
        if [ ! -z "$MENTOR_TOKEN" ] && [ ! -z "$PASS_ID" ]; then
            echo "👨‍🏫 Testing mentor approval..."
            MENTOR_APPROVAL=$(curl -s -X PUT $API_BASE/passes/$PASS_ID/mentor-approve \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer $MENTOR_TOKEN" \
              -d '{
                "action": "approve",
                "comments": "Integration test approval"
              }')
            
            if echo "$MENTOR_APPROVAL" | grep -q '"success":true'; then
                echo -e "${GREEN}✅ Mentor approval successful${NC}"
            else
                echo -e "${RED}❌ Mentor approval failed${NC}"
                echo "$MENTOR_APPROVAL"
            fi
        fi
        
    else
        echo -e "${RED}❌ Gate pass creation failed${NC}"
        echo "$PASS_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping gate pass test - no student token${NC}"
fi

# Test Statistics Access
echo -e "\n${YELLOW}🧪 Testing Statistics Access...${NC}"

if [ ! -z "$HOD_TOKEN" ]; then
    STATS_RESPONSE=$(curl -s -X GET $API_BASE/passes/stats/dashboard \
      -H "Authorization: Bearer $HOD_TOKEN")
    
    if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Statistics access successful${NC}"
    else
        echo -e "${RED}❌ Statistics access failed${NC}"
        echo "$STATS_RESPONSE"
    fi

    # Test student access to statistics (should fail)
    if [ ! -z "$STUDENT_TOKEN" ]; then
        STUDENT_STATS=$(curl -s -X GET $API_BASE/passes/stats/dashboard \
          -H "Authorization: Bearer $STUDENT_TOKEN")
        
        if echo "$STUDENT_STATS" | grep -q '"error"'; then
            echo -e "${GREEN}✅ Student statistics access properly blocked${NC}"
        else
            echo -e "${RED}❌ Student statistics access should be blocked${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Skipping statistics test - no HOD token${NC}"
fi

echo -e "\n${GREEN}✨ Integration tests completed!${NC}"
echo "==============================================="